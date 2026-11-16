import { SetMetadata } from '@nestjs/common';
import type { Role } from './authenticated-user.js';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

/** Libera a rota sem access token (ex.: health, webhooks com assinatura própria). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Restringe a rota às roles informadas. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
