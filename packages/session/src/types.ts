export interface SessionUser {
  admin?: boolean;
  superAdmin?: boolean;
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
}

export interface PlayerProfile {
  uid: string;
  idUser: string;
  idClashRoyale: string;
  nome: string;
  source: 'current' | 'legacy';
}

export interface SessionDriver {
  start(
    onUser: (user: SessionUser | null) => void,
    onError: (error: unknown) => void,
  ): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  google(): Promise<void>;
  signOut(): Promise<void>;
  loadProfile(user: SessionUser): Promise<PlayerProfile | null>;
  linkPlayer(user: SessionUser, tag: string): Promise<PlayerProfile>;
}

export interface SessionSnapshot {
  status: 'initializing' | 'anonymous' | 'authenticated' | 'unconfigured' | 'error';
  user: SessionUser | null;
  profile: PlayerProfile | null;
  profileStatus: 'idle' | 'loading' | 'ready' | 'error';
  profileError: string | null;
  pending: boolean;
  error: string | null;
}
