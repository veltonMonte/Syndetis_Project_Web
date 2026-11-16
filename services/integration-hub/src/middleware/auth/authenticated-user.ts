export const ROLES = ['CUSTOMER', 'SELLER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

/** Usuário extraído de um access token válido emitido pelo auth-service. */
export interface AuthenticatedUser {
  id: string;
  role: Role;
  email?: string;
}
