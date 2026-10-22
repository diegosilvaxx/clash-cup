try {
  const response = await fetch('http://127.0.0.1:5400/api/health', {
    signal: AbortSignal.timeout(4000),
  });
  const body = await response.json();
  if (!response.ok || body.status !== 'ok' || body.service !== 'clash-cup-api')
    process.exitCode = 1;
} catch {
  process.exitCode = 1;
}
