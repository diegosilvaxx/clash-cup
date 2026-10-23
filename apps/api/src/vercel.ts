import { createClashService } from './clash-client';
import { createApiHandler } from './server';

// Vercel invokes the handler directly; the local and Docker entries own their HTTP servers.
export default createApiHandler(createClashService(process.env.CLASH_ROYALE_API_TOKEN));
