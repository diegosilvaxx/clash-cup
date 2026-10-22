import type { Auth } from 'firebase-admin/auth';
import {
  FieldValue,
  type Firestore,
  type DocumentSnapshot,
  type QuerySnapshot,
} from 'firebase-admin/firestore';
import {
  adminOverviewSchema,
  adminTournamentSchema,
  importPeriodSchema,
  type AdminPrincipal,
  type AdminTournamentInput,
  type ImportPeriod,
  type WalletBinding,
} from '@clash-cup/contracts';
import type { ClashService } from './clash-client';
import { adminRuntime } from './admin-runtime';
import {
  addAmount,
  canonicalTag,
  jobSummary,
  legacyCount,
  legacyWalletSchema,
  requirePeriod,
  snapshotResults,
  storedImportSchema,
} from './admin-model';
import { ApiError } from './errors';

type Runtime = { auth: Auth; database: Firestore };
const conflict = (message: string) => new ApiError(409, 'REVIEW_REQUIRED', message);
function choose(query: QuerySnapshot, fallback: DocumentSnapshot, label: string) {
  if (query.docs.length > 1)
    throw conflict(`Há registros duplicados em ${label}. Revise os dados antes de continuar.`);
  if (query.docs[0]) return query.docs[0];
  if (fallback.exists)
    throw conflict(`O registro existente em ${label} possui um identificador incompatível.`);
  return fallback;
}
export function createAdminService(clash: ClashService, runtime: () => Runtime = adminRuntime) {
  async function readJob(id: string) {
    const record = await runtime().database.collection('resultImports').doc(id).get();
    if (!record.exists) throw new ApiError(404, 'IMPORT_NOT_FOUND', 'Importação não encontrada.');
    const parsed = storedImportSchema.safeParse(record.data());
    if (!parsed.success) throw conflict('Esta importação precisa de revisão antes de continuar.');
    return parsed.data;
  }
  async function applyMember(principal: AdminPrincipal, id: string, tag: string) {
    const db = runtime().database;
    const root = db.collection('resultImports').doc(id);
    const receipt = root.collection('players').doc(tag);
    return db.runTransaction(async (tx) => {
      const [rootRecord, receiptRecord] = await tx.getAll(root, receipt);
      const job = storedImportSchema.parse(rootRecord!.data());
      const member = job.members.find((item) => item.tag === tag);
      if (!member) throw conflict('O jogador não pertence à importação registrada.');
      if (receiptRecord!.exists) {
        if (receiptRecord!.data()?.fingerprint !== job.fingerprint)
          throw conflict('O comprovante desta pontuação precisa de revisão.');
        return;
      }
      const rankingRef = db.collection('ranking').doc(tag);
      const historyRef = db.collection('rankingHistory').doc(`${tag}_${job.month}_${job.year}`);
      const walletRef = db.collection('shop').doc(tag);
      const [rankingFallback, historyFallback, walletFallback] = await tx.getAll(
        rankingRef,
        historyRef,
        walletRef,
      );
      const [rankings, histories, wallets] = await Promise.all([
        tx.get(db.collection('ranking').where('tag', '==', tag)),
        tx.get(db.collection('rankingHistory').where('tag', '==', tag)),
        tx.get(db.collection('shop').where('idClashRoyale', '==', tag)),
      ]);
      const ranking = choose(rankings, rankingFallback!, 'ranking');
      const monthly = histories.docs.filter(
        (item) => item.data().month === job.month && item.data().year === job.year,
      );
      if (monthly.length > 1) throw conflict('Há pontuações mensais duplicadas para este jogador.');
      const history = monthly[0] ?? historyFallback!;
      if (
        history.exists &&
        (history.data()?.tag !== tag ||
          history.data()?.year !== job.year ||
          history.data()?.month !== job.month)
      )
        throw conflict('O histórico deste jogador precisa de revisão.');
      const wallet = choose(wallets, walletFallback!, 'saldos');
      if (wallet.exists) {
        const parsed = legacyWalletSchema.safeParse(wallet.data());
        if (!parsed.success || parsed.data.idClashRoyale !== tag)
          throw conflict('O saldo deste jogador precisa de revisão antes do crédito.');
      }
      const standing = {
        tag,
        name: member.name,
        clan: member.clan,
        lastUpdated: FieldValue.serverTimestamp(),
      };
      tx.set(
        ranking.ref,
        { ...standing, score: addAmount(ranking.exists ? ranking.data()?.score : 0, member.score) },
        { merge: true },
      );
      tx.set(
        history.ref,
        {
          ...standing,
          month: job.month,
          year: job.year,
          score: addAmount(history.exists ? history.data()?.score : 0, member.score),
          ...(!history.exists ? { createdAt: FieldValue.serverTimestamp() } : {}),
        },
        { merge: true },
      );
      tx.set(
        wallet.ref,
        {
          idClashRoyale: tag,
          gold: addAmount(wallet.exists ? (wallet.data()?.gold ?? 0) : 0, member.score),
          lastUpdated: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      tx.create(receipt, {
        tag,
        score: member.score,
        year: job.year,
        month: job.month,
        fingerprint: job.fingerprint,
        actorUid: principal.uid,
        creditedAt: FieldValue.serverTimestamp(),
      });
      const processed = job.processed + 1;
      if (processed > job.total) throw conflict('A contagem da importação precisa de revisão.');
      tx.update(root, {
        processed,
        status: processed === job.total ? 'completed' : 'processing',
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  }
  return {
    async overview() {
      const db = runtime().database;
      const [tournaments, wallets, imports] = await Promise.all(
        ['tournament', 'shop', 'resultImports'].map((name) => db.collection(name).get()),
      );
      const result = {
        tournaments: [] as unknown[],
        wallets: [] as unknown[],
        imports: [] as unknown[],
        invalidTournaments: 0,
        invalidWallets: 0,
        invalidImports: 0,
      };
      for (const record of tournaments!.docs) {
        const data = record.data();
        const parsed = adminTournamentSchema.safeParse({
          ...data,
          id: record.id,
          vacancies: legacyCount.safeParse(data.vacancies).data,
          occupied: legacyCount.safeParse(data.vacanciesAvailable).data,
          description: data.description ?? '',
          date: data.date ?? '',
          tournamentLink: data.tournamentLink ?? '',
          status: data.status ?? 'open',
        });
        if (parsed.success && parsed.data.occupied <= parsed.data.vacancies)
          result.tournaments.push(parsed.data);
        else ++result.invalidTournaments;
      }
      for (const record of wallets!.docs) {
        const parsed = legacyWalletSchema.safeParse(record.data());
        if (parsed.success)
          result.wallets.push({
            id: record.id,
            tag: parsed.data.idClashRoyale,
            gold: parsed.data.gold,
            ownerUid: parsed.data.ownerUid ?? null,
          });
        else ++result.invalidWallets;
      }
      for (const record of imports!.docs) {
        const parsed = storedImportSchema.safeParse(record.data());
        if (parsed.success) result.imports.push(jobSummary(parsed.data));
        else ++result.invalidImports;
      }
      return adminOverviewSchema.parse(result);
    },
    async saveTournament(principal: AdminPrincipal, input: AdminTournamentInput, create: boolean) {
      const db = runtime().database;
      const ref = db.collection('tournament').doc(input.id);
      await db.runTransaction(async (tx) => {
        const current = await tx.get(ref);
        if (create && current.exists)
          throw conflict('Este torneio já foi criado. Atualize a lista antes de tentar novamente.');
        if (!create && !current.exists)
          throw new ApiError(404, 'TOURNAMENT_NOT_FOUND', 'Torneio não encontrado.');
        const occupied = create ? 0 : legacyCount.parse(current.data()?.vacanciesAvailable);
        if (input.vacancies < occupied)
          throw conflict('A capacidade não pode ser menor que o número de inscritos.');
        const { id, ...fields } = input;
        if (create)
          tx.create(ref, {
            ...fields,
            id,
            vacanciesAvailable: 0,
            createdAt: FieldValue.serverTimestamp(),
            createdBy: principal.uid,
          });
        else
          tx.update(ref, {
            ...fields,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: principal.uid,
          });
        tx.create(db.collection('adminAudit').doc(), {
          action: create ? 'tournament.create' : 'tournament.update',
          actorUid: principal.uid,
          target: ref.path,
          at: FieldValue.serverTimestamp(),
        });
      });
      return { saved: true };
    },
    async bindWallet(principal: AdminPrincipal, input: WalletBinding) {
      const { auth, database: db } = runtime();
      const user = await auth.getUser(input.uid);
      if (user.disabled) throw conflict('A conta de destino está desabilitada.');
      const ref = db.collection('shop').doc(input.walletId);
      await db.runTransaction(async (tx) => {
        const walletRecord = await tx.get(ref);
        if (!walletRecord.exists)
          throw new ApiError(404, 'WALLET_NOT_FOUND', 'Saldo não encontrado.');
        const wallet = legacyWalletSchema.parse(walletRecord.data());
        if (canonicalTag(wallet.idClashRoyale) !== wallet.idClashRoyale)
          throw conflict('Normalize a tag do saldo antes de associar a conta.');
        const linked = await tx.get(db.collection('playerProfiles').doc(input.uid));
        const legacy =
          !linked.exists && user.email && user.emailVerified
            ? await tx.get(db.collection('users').doc(user.email))
            : null;
        const profile = linked.exists ? linked.data() : legacy?.data();
        if (
          !profile ||
          (linked.exists ? profile.uid !== input.uid : profile.idUser !== user.email) ||
          typeof profile.idClashRoyale !== 'string' ||
          canonicalTag(profile.idClashRoyale) !== wallet.idClashRoyale
        )
          throw conflict('O jogador vinculado à conta não corresponde à tag do saldo.');
        const duplicates = await tx.get(
          db.collection('shop').where('idClashRoyale', '==', wallet.idClashRoyale),
        );
        if (duplicates.size !== 1)
          throw conflict('Há mais de um saldo para esta tag. Revise os registros.');
        if (wallet.ownerUid && wallet.ownerUid !== input.uid)
          throw conflict(
            'Este saldo já está associado a outra conta. A transferência exige revisão da organização.',
          );
        if (wallet.ownerUid === input.uid) return;
        tx.update(ref, {
          ownerUid: input.uid,
          associatedBy: principal.uid,
          associatedAt: FieldValue.serverTimestamp(),
        });
        tx.create(db.collection('adminAudit').doc(), {
          action: 'wallet.bind',
          actorUid: principal.uid,
          target: ref.path,
          ownerUid: input.uid,
          reason: input.reason,
          at: FieldValue.serverTimestamp(),
        });
      });
      return { associated: true };
    },
    async preview(period: ImportPeriod, signal?: AbortSignal) {
      const db = runtime().database;
      const tag = canonicalTag(period.tag);
      const existing = await db.collection('resultImports').doc(tag.slice(1)).get();
      if (existing.exists) {
        const job = storedImportSchema.parse(existing.data());
        requirePeriod(job, period);
        return {
          tag,
          name: job.name,
          year: job.year,
          month: job.month,
          members: job.members,
          fingerprint: job.fingerprint,
          existing: jobSummary(job),
        };
      }
      const snapshot = snapshotResults(await clash.tournament(tag.slice(1), signal), period);
      return {
        tag,
        name: snapshot.name,
        year: period.year,
        month: period.month,
        members: snapshot.members,
        fingerprint: snapshot.fingerprint,
        existing: null,
      };
    },
    async startImport(
      principal: AdminPrincipal,
      period: ImportPeriod & { fingerprint: string },
      signal?: AbortSignal,
    ) {
      const parsed = importPeriodSchema.parse(period);
      const preview = await this.preview(parsed, signal);
      if (preview.existing) return preview.existing;
      // Fetch again on the server at confirmation; a client preview cannot supply scores.
      const snapshot = snapshotResults(
        await clash.tournament(canonicalTag(period.tag).slice(1), signal),
        period,
      );
      if (snapshot.fingerprint !== period.fingerprint)
        throw conflict('O resultado mudou após a consulta. Consulte novamente antes de confirmar.');
      const db = runtime().database;
      const ref = db.collection('resultImports').doc(snapshot.tag.slice(1));
      await db.runTransaction(async (tx) => {
        const record = await tx.get(ref);
        if (record.exists) {
          requirePeriod(jobSummary(record.data()), period);
          return;
        }
        tx.create(ref, {
          ...snapshot,
          id: ref.id,
          total: snapshot.members.length,
          processed: 0,
          status: 'processing',
          createdBy: principal.uid,
          createdAt: FieldValue.serverTimestamp(),
        });
        tx.create(db.collection('adminAudit').doc(), {
          action: 'import.start',
          actorUid: principal.uid,
          target: ref.path,
          fingerprint: snapshot.fingerprint,
          at: FieldValue.serverTimestamp(),
        });
      });
      return jobSummary(await readJob(ref.id));
    },
    async processImport(principal: AdminPrincipal, id: string, signal?: AbortSignal) {
      const job = await readJob(id);
      if (job.status === 'completed') return jobSummary(job);
      const receipts = await runtime()
        .database.collection('resultImports')
        .doc(id)
        .collection('players')
        .get();
      const done = new Set(receipts.docs.map((item) => item.id));
      const pending = job.members.filter((member) => !done.has(member.tag)).slice(0, 5);
      if (!pending.length) throw conflict('A contagem desta importação precisa de revisão.');
      for (const member of pending) {
        if (signal?.aborted) break;
        await applyMember(principal, id, member.tag);
      }
      return jobSummary(await readJob(id));
    },
    async listRoles(principal: AdminPrincipal) {
      if (!principal.superAdmin)
        throw new ApiError(
          403,
          'FORBIDDEN',
          'Somente o administrador responsável pode gerenciar acessos.',
        );
      const roles = [];
      let page: string | undefined;
      do {
        const result = await runtime().auth.listUsers(1000, page);
        for (const user of result.users)
          if (user.customClaims?.admin === true)
            roles.push({
              uid: user.uid,
              email: user.email ?? null,
              displayName: user.displayName ?? null,
              superAdmin: user.customClaims.superAdmin === true,
            });
        page = result.pageToken;
      } while (page);
      return roles;
    },
    async changeRole(principal: AdminPrincipal, email: string, action: 'grant' | 'revoke') {
      if (!principal.superAdmin)
        throw new ApiError(
          403,
          'FORBIDDEN',
          'Somente o administrador responsável pode gerenciar acessos.',
        );
      const { auth, database } = runtime();
      const user = await auth.getUserByEmail(email);
      if (user.uid === principal.uid || user.customClaims?.superAdmin === true)
        throw conflict(
          'O acesso do administrador responsável é gerenciado pelo procedimento de configuração.',
        );
      if (user.disabled) throw conflict('Esta conta está desabilitada.');
      const enabled = action === 'grant';
      if ((user.customClaims?.admin === true) === enabled) return { changed: false };
      const audit = database.collection('adminAudit').doc();
      await audit.set({
        action: `role.${action}`,
        actorUid: principal.uid,
        targetUid: user.uid,
        status: 'requested',
        at: FieldValue.serverTimestamp(),
      });
      await auth.setCustomUserClaims(user.uid, { ...user.customClaims, admin: enabled });
      if (!enabled) await auth.revokeRefreshTokens(user.uid);
      await audit.update({ status: 'completed', completedAt: FieldValue.serverTimestamp() });
      return { changed: true };
    },
  };
}
export type AdminService = ReturnType<typeof createAdminService>;
