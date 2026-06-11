/** Papel do usuário na plataforma. */
export type UserRole = 'SYSTEM_ADMIN' | 'PUBLISHER';

export interface AuthUser {
  username: string;
  role: UserRole;
  /** Endereço público do publicador (/handle). */
  handle: string;
}

/** Auto-registro público (entra na fila de aprovação). */
export interface RegisterRequest {
  username: string;
  password: string;
  handle: string;
}
