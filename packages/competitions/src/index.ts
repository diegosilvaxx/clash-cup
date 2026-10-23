import {
  collection,
  createReadCache,
  type ReadOptions,
  doc,
  getDocs,
  getFirestore,
  getFirebaseApp,
  getAuth,
  query,
  where,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from '@clash-cup/firebase';
import type { PlayerProfile, SessionUser } from '@clash-cup/session';
import {
  CompetitionError,
  parseCompetition,
  resolveLegacyRegistration,
  type Competition,
  type Registration,
} from './model';
export * from './model';

export function createCompetitionRepository(
  database: () => Firestore = () => getFirestore(getFirebaseApp()),
) {
  const cache = createReadCache();
  function assertUser(user: SessionUser) {
    if (getAuth(getFirebaseApp()).currentUser?.uid !== user.uid)
      throw new CompetitionError('Sua sessão mudou. Entre novamente para continuar.');
  }
  async function legacy(
    user: SessionUser,
    competitions: Competition[],
    legacyIds?: ReadonlyMap<string, readonly string[]>,
  ): Promise<Registration[]> {
    if (!user.emailVerified || !user.email) return [];
    const result = await getDocs(
      query(collection(database(), 'myTournament'), where('idUser', '==', user.email)),
    );
    assertUser(user);
    return result.docs.map((item) =>
      resolveLegacyRegistration(item.id, item.data(), competitions, legacyIds),
    );
  }
  return {
    async list(options: ReadOptions = {}): Promise<{
      items: Competition[];
      invalid: number;
      legacyIds: ReadonlyMap<string, readonly string[]>;
    }> {
      return cache.read(
        'catalog',
        async () => {
          const result = await getDocs(collection(database(), 'tournament'));
          const items: Competition[] = [];
          let invalid = 0;
          const legacyIds = new Map<string, string[]>();
          for (const document of result.docs) {
            const data = document.data();
            if (typeof data.id === 'string')
              legacyIds.set(data.id, [...(legacyIds.get(data.id) ?? []), document.id]);
            try {
              items.push(parseCompetition(document.id, document.data()));
            } catch {
              ++invalid;
            }
          }
          items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id));
          return { items, invalid, legacyIds };
        },
        options,
      );
    },
    async registrations(
      user: SessionUser,
      competitions: Competition[],
      legacyIds?: ReadonlyMap<string, readonly string[]>,
    ): Promise<Registration[]> {
      assertUser(user);
      const [current, old] = await Promise.all([
        getDocs(collection(database(), 'competitionRegistrations', user.uid, 'tournaments')),
        legacy(user, competitions, legacyIds),
      ]);
      assertUser(user);
      return [
        ...current.docs.map((item) => ({
          id: item.id,
          tournamentId: item.id,
          legacyId: null,
          source: 'current' as const,
          problem: competitions.some((tournament) => tournament.id === item.id)
            ? null
            : 'O torneio desta inscrição não está disponível.',
        })),
        ...old,
      ];
    },
    async join(
      user: SessionUser,
      profile: PlayerProfile,
      tournamentId: string,
      competitions: Competition[],
    ) {
      assertUser(user);
      if (profile.uid !== user.uid)
        throw new CompetitionError('Carregue novamente os dados da sua conta.');
      const previous = await legacy(user, competitions);
      const target = competitions.find((item) => item.id === tournamentId);
      if (
        previous.some(
          (item) =>
            item.tournamentId === tournamentId ||
            (target?.legacyId && item.legacyId === target.legacyId),
        )
      )
        throw new CompetitionError(
          'Já existe uma inscrição antiga associada a este torneio. Confira Meus torneios.',
        );
      const db = database();
      const tournamentRef = doc(db, 'tournament', tournamentId);
      const registrationRef = doc(
        db,
        'competitionRegistrations',
        user.uid,
        'tournaments',
        tournamentId,
      );
      const result = await runTransaction(db, async (transaction) => {
        assertUser(user);
        const tournament = await transaction.get(tournamentRef);
        const registration = await transaction.get(registrationRef);
        assertUser(user);
        if (!tournament.exists())
          throw new CompetitionError('Este torneio não está mais disponível.');
        const current = parseCompetition(tournament.id, tournament.data());
        if (registration.exists()) return 'existing' as const;
        if (!current.open)
          throw new CompetitionError('As inscrições deste torneio estão encerradas.');
        if (current.remaining <= 0) throw new CompetitionError('As vagas deste torneio esgotaram.');
        transaction.set(registrationRef, {
          uid: user.uid,
          tournamentId,
          idClashRoyale: profile.idClashRoyale,
          registeredAt: serverTimestamp(),
        });
        transaction.update(tournamentRef, {
          vacanciesAvailable: current.occupied + 1,
          lastRegistrationChange: { uid: user.uid, kind: 'join', at: serverTimestamp() },
        });
        return 'created' as const;
      });
      cache.invalidate('catalog');
      return result;
    },
    async cancel(user: SessionUser, tournamentId: string) {
      assertUser(user);
      const db = database();
      const tournamentRef = doc(db, 'tournament', tournamentId);
      const registrationRef = doc(
        db,
        'competitionRegistrations',
        user.uid,
        'tournaments',
        tournamentId,
      );
      const result = await runTransaction(db, async (transaction) => {
        assertUser(user);
        const tournament = await transaction.get(tournamentRef);
        const registration = await transaction.get(registrationRef);
        assertUser(user);
        if (!registration.exists()) return 'absent' as const;
        // An orphaned registration can be removed without modifying another tournament.
        if (tournament.exists()) {
          const current = parseCompetition(tournament.id, tournament.data());
          if (current.occupied === 0)
            throw new CompetitionError(
              'A contagem de vagas precisa ser revisada pela organização antes do cancelamento.',
            );
          transaction.update(tournamentRef, {
            vacanciesAvailable: current.occupied - 1,
            lastRegistrationChange: { uid: user.uid, kind: 'cancel', at: serverTimestamp() },
          });
        }
        transaction.delete(registrationRef);
        return 'cancelled' as const;
      });
      cache.invalidate('catalog');
      return result;
    },
  };
}
export const competitions = createCompetitionRepository();

export * from './championship-model';
export { championships } from './championship-repository';
