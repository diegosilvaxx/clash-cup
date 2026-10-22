import type { BrowserContext } from '@playwright/test';
import {
  createCompetitionFixture,
  type CompetitionFixtureOptions,
  type RewardFixtureOptions,
} from './competition-fixture';

const uid = 'fixture-user';
const email = 'player@example.test';
const profileFields = {
  uid: { stringValue: uid },
  idUser: { stringValue: email },
  idClashRoyale: { stringValue: '#P0Y' },
  nome: { stringValue: 'Jogador de teste' },
};

export async function mockFirebase(
  context: BrowserContext,
  options: {
    profile?: 'current' | 'legacy' | 'none';
    profileDenied?: boolean;
    competitions?: CompetitionFixtureOptions;
    chests?: 'available' | 'empty';
    player?: 'full' | 'minimal';
    rewards?: RewardFixtureOptions;
  } = {},
) {
  const competition = createCompetitionFixture({
    ...options.competitions,
    ...(options.rewards ? { rewards: options.rewards } : {}),
  });
  let current = options.profile === 'current' ? profileFields : null;
  let verified = options.profile === 'legacy';
  let writes = 0;
  let lookupFailure = false;
  let chestFailure = false;
  let playerReads = 0;
  let chestReads = 0;
  const blocked: string[] = [];
  function jwt() {
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    return `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ aud: 'demo-clash-cup', iss: 'https://securetoken.google.com/demo-clash-cup', sub: uid, user_id: uid, email, email_verified: verified, auth_time: now, iat: now, exp: now + 3600, firebase: { sign_in_provider: 'password', identities: { email: [email] } } })}.fixture-signature`;
  }
  function account() {
    return {
      localId: uid,
      email,
      emailVerified: verified,
      displayName: 'Jogador de teste',
      providerUserInfo: [{ providerId: 'password', email, rawId: email }],
      validSince: '0',
      createdAt: '1700000000000',
      lastLoginAt: '1700000000000',
    };
  }
  await context.route('https://**/*', async (route) => {
    const cors = {
      'access-control-allow-origin': route.request().headers().origin || '*',
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
      'access-control-allow-headers':
        route.request().headers()['access-control-request-headers'] ||
        'authorization,content-type,x-client-version,x-firebase-gmpid,x-firebase-client,x-firebase-locale,x-firebase-client-log-type,x-firebase-appcheck',
    };
    const reply = (options: NonNullable<Parameters<typeof route.fulfill>[0]>) =>
      route.fulfill({ ...options, headers: { ...cors, ...options.headers } });
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (
      request.method() === 'OPTIONS' &&
      [
        'identitytoolkit.googleapis.com',
        'securetoken.googleapis.com',
        'firestore.googleapis.com',
      ].includes(url.hostname)
    ) {
      await reply({ status: 204 });
      return;
    }
    if (url.hostname === 'identitytoolkit.googleapis.com') {
      if (path.endsWith('accounts:lookup')) {
        await reply({ json: { users: [account()] } });
        return;
      }
      if (path.endsWith('accounts:signInWithPassword') || path.endsWith('accounts:signUp')) {
        const body = request.postDataJSON() as { password?: string };
        if (body.password === 'incorrect-password') {
          await reply({
            status: 400,
            json: { error: { code: 400, message: 'INVALID_LOGIN_CREDENTIALS' } },
          });
          return;
        }
        if (path.endsWith('accounts:signUp')) verified = false;
        await reply({
          json: {
            ...account(),
            idToken: jwt(),
            refreshToken: 'fixture-refresh-token',
            expiresIn: '3600',
            registered: true,
          },
        });
        return;
      }
      if (path.endsWith('/projects')) {
        await reply({
          json: {
            authorizedDomains: ['127.0.0.1'],
            signIn: { email: { enabled: true, passwordRequired: true } },
          },
        });
        return;
      }
    }
    if (url.hostname === 'securetoken.googleapis.com') {
      await reply({
        json: {
          access_token: jwt(),
          id_token: jwt(),
          refresh_token: 'fixture-refresh-token',
          expires_in: '3600',
          user_id: uid,
          token_type: 'Bearer',
          project_id: 'demo-clash-cup',
        },
      });
      return;
    }
    if (url.hostname === 'firestore.googleapis.com') {
      if (await competition.handle(route, reply)) return;
      if (path.endsWith(`/playerProfiles/${uid}`)) {
        if (options.profileDenied) {
          await reply({ status: 403, json: { error: { status: 'PERMISSION_DENIED' } } });
          return;
        }
        if (request.method() === 'PATCH') {
          if (current) {
            await reply({
              status: 412,
              json: { error: { status: 'FAILED_PRECONDITION' } },
            });
            return;
          }
          current = (request.postDataJSON() as { fields: typeof profileFields }).fields;
          ++writes;
        }
        await reply(
          current
            ? { json: { fields: current } }
            : { status: 404, json: { error: { status: 'NOT_FOUND' } } },
        );
        return;
      }
      if (path.includes('/users/')) {
        await reply(
          options.profile === 'legacy'
            ? { json: { fields: profileFields } }
            : { status: 404, json: { error: { status: 'NOT_FOUND' } } },
        );
        return;
      }
    }
    blocked.push(url.hostname + path);
    await route.abort();
  });
  await context.route('**/api/player?**', async (route) => {
    ++playerReads;
    await route.fulfill(
      lookupFailure
        ? { status: 503, json: { error: { code: 'API_NOT_CONFIGURED', message: 'Unavailable' } } }
        : {
            json: {
              tag: '#P0Y',
              name: 'Jogador de teste',
              ...(options.player === 'minimal'
                ? {}
                : {
                    expLevel: 15,
                    trophies: 9000,
                    bestTrophies: 9100,
                    wins: 100,
                    losses: 0,
                    battleCount: 100,
                    threeCrownWins: 25,
                    totalDonations: 2000,
                    clan: { tag: '#ABC', name: 'Clã da comunidade' },
                    arena: { name: 'Arena lendária' },
                    currentDeck: [
                      { id: 1, name: 'Arqueiras' },
                      { id: 2, name: 'Gigante', iconUrls: { medium: 'javascript:alert(1)' } },
                    ],
                  }),
            },
          },
    );
  });
  await context.route('**/api/upcomingchests?**', async (route) => {
    ++chestReads;
    await route.fulfill(
      chestFailure
        ? { status: 503, json: { error: { code: 'API_NOT_CONFIGURED', message: 'Unavailable' } } }
        : {
            json: {
              items:
                options.chests === 'empty'
                  ? []
                  : [
                      { index: 2, name: 'Gold Chest' },
                      { index: 0, name: 'Silver Chest' },
                    ],
            },
          },
    );
  });
  return {
    getPlayerReads: () => playerReads,
    getChestReads: () => chestReads,
    failChestLookup: (fail: boolean) => {
      chestFailure = fail;
    },
    competition,
    getWrites: () => writes,
    getBlocked: () => blocked,
    failPlayerLookup: (fail: boolean) => {
      lookupFailure = fail;
    },
  };
}
