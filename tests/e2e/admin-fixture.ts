import type { Route } from '@playwright/test';
import type { AdminOverview, AdminTournamentInput, ImportJob } from '@clash-cup/contracts';

export function createAdminFixture(access?: 'admin' | 'responsible') {
  const data: AdminOverview = {
    tournaments: [
      {
        id: 'cup',
        name: 'Copa da comunidade',
        description: '',
        date: '',
        tournamentLink: '',
        vacancies: 2,
        occupied: 1,
        status: 'open',
      },
    ],
    wallets: [{ id: '#P0Y', tag: '#P0Y', gold: 10, ownerUid: null }],
    imports: [],
    invalidTournaments: 0,
    invalidWallets: 0,
    invalidImports: 0,
  };
  let calls = 0;
  let failed = false;
  let processFailure = false;
  let credits = 0;
  const mutations: { path: string; body: Record<string, unknown> }[] = [];
  const fingerprint = 'a'.repeat(64);
  async function handle(route: Route) {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/admin', '');
    ++calls;
    const error = (status: number, message: string) =>
      route.fulfill({ status, json: { error: { code: 'FIXTURE_ERROR', message } } });
    if (!access || !request.headers().authorization?.startsWith('Bearer ')) {
      await error(403, 'Sua conta não tem acesso à administração.');
      return;
    }
    if (failed) {
      await error(503, 'Administração temporariamente indisponível.');
      return;
    }
    if (path === '/overview') {
      await route.fulfill({ json: data });
      return;
    }
    const body =
      request.method() === 'GET' ? {} : (request.postDataJSON() as Record<string, unknown>);
    if (path === '/tournaments') {
      const input = body as AdminTournamentInput;
      const existing = data.tournaments.find((item) => item.id === input.id);
      if (existing) Object.assign(existing, input);
      else data.tournaments.push({ ...input, occupied: 0 });
      mutations.push({ path, body });
      await route.fulfill({ json: { saved: true } });
      return;
    }
    if (path === '/wallets/associate') {
      data.wallets[0]!.ownerUid = String(body.uid);
      mutations.push({ path, body });
      await route.fulfill({ json: { associated: true } });
      return;
    }
    if (path === '/imports/preview') {
      await route.fulfill({
        json: {
          tag: '#CUP',
          name: 'Copa encerrada',
          year: body.year,
          month: body.month,
          fingerprint,
          members: [{ tag: '#P0Y', name: 'Jogador de teste', score: 3, clan: null }],
          existing: data.imports[0] ?? null,
        },
      });
      return;
    }
    if (path === '/imports') {
      const job: ImportJob = data.imports[0] ?? {
        id: 'CUP',
        tag: '#CUP',
        name: 'Copa encerrada',
        year: Number(body.year),
        month: Number(body.month),
        total: 1,
        processed: 0,
        status: 'processing',
      };
      if (!data.imports.length) data.imports.push(job);
      mutations.push({ path, body });
      await route.fulfill({ json: job });
      return;
    }
    if (path === '/imports/CUP/process') {
      if (processFailure) {
        await error(503, 'Falha temporária ao processar o lote.');
        return;
      }
      const job = data.imports[0]!;
      if (job.status !== 'completed') {
        job.processed = 1;
        job.status = 'completed';
        data.wallets[0]!.gold += 3;
        ++credits;
      }
      await route.fulfill({ json: job });
      return;
    }
    if (path === '/roles') {
      if (access !== 'responsible') {
        await error(403, 'Somente o administrador responsável pode gerenciar acessos.');
        return;
      }
      if (request.method() === 'GET')
        await route.fulfill({
          json: [
            {
              uid: 'fixture-user',
              email: 'player@example.test',
              displayName: null,
              superAdmin: true,
            },
          ],
        });
      else {
        mutations.push({ path, body });
        await route.fulfill({ json: { changed: true } });
      }
      return;
    }
    await error(404, 'Endereço não encontrado.');
  }
  return {
    handle,
    data,
    getCalls: () => calls,
    getMutations: () => mutations,
    getCredits: () => credits,
    fail: (value: boolean) => {
      failed = value;
    },
    failProcess: (value: boolean) => {
      processFailure = value;
    },
  };
}
