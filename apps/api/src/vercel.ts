import { createClashService } from './clash-client';
import { createApiServer } from './server';

// Vercel owns the listener; this entry must not call listen() or load a local .env.
export default createApiServer(createClashService(process.env.CLASH_ROYALE_API_TOKEN));
