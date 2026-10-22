export function shellUrl(path = '/') {
  return new URL(path, import.meta.env.VITE_SHELL_URL || 'http://127.0.0.1:5300').href;
}
