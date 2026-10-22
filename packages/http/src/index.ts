import axios from 'axios';

export function createHttpClient(baseURL = '/api') {
  return axios.create({ baseURL, timeout: 10_000, headers: { Accept: 'application/json' } });
}
