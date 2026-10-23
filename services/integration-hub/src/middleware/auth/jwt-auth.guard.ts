import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY, ROLES_KEY } from './auth.decorators.js';
import type { AuthenticatedUser, Role } from './authenticated-user.js';
import { InvalidTokenError, JwtVerifier } from './jwt-verifier.service.js';

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

/** Guard global: toda rota exige Bearer token, exceto as marcadas com `@Public()`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: JwtVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Access token ausente: informe o token Bearer no cabeçalho Authorization');
    }

    try {
      request.user = await this.verifier.verify(token);
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        throw new UnauthorizedException(
          `Access token inválido: o token expirou, possui assinatura não reconhecida ou alegações inválidas (${error.message})`,
        );
      }
      throw error;
    }

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles?.length && !roles.includes(request.user.role)) {
      throw new ForbiddenException(
        `Permissão insuficiente: a função '${request.user.role}' não tem acesso a esta operação`,
      );
    }
    return true;
  }
}
