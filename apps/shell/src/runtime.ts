import type { ComponentType } from 'react';
import { getInstance } from '@module-federation/runtime';
import { runtimeConfigSchema } from '@clash-cup/contracts';
import { createHttpClient } from '@clash-cup/http';

const http = createHttpClient('/');
let registration: { configuredEntry: string; entry: string } | undefined;

export async function loadPortal(attempt = 0) {
  const response = await http.get<unknown>('/runtime-config.json', {
    params: { attempt },
    headers: { 'Cache-Control': 'no-cache' },
  });
  const config = runtimeConfigSchema.parse(response.data);
  const configuredEntry = new URL(config.remotes.portal).href;
  const entry = new URL(
    attempt === 0 && registration?.configuredEntry === configuredEntry
      ? registration.entry
      : configuredEntry,
  );
  if (attempt > 0) entry.searchParams.set('retry', `${Date.now()}-${attempt}`);
  const runtime = getInstance((instance) => instance.name === 'shell');
  if (!runtime) throw new Error('Runtime indisponível.');
  if (registration?.entry !== entry.href) {
    runtime.registerRemotes([{ name: 'portal', entry: entry.href, type: 'module' }], {
      force: Boolean(registration),
    });
    registration = { configuredEntry, entry: entry.href };
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const module = await Promise.race([
      runtime.loadRemote<{ App: ComponentType }>('portal/App'),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Tempo de carregamento excedido.')), 10_000);
      }),
    ]);
    if (typeof module?.App !== 'function') throw new Error('Módulo indisponível.');
    return { default: module.App };
  } finally {
    clearTimeout(timer);
  }
}
