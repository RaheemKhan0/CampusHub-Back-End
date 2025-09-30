// src/guards/server-roles.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { SERVER_ROLES_KEY } from '../decorators/server-roles.decorator';
import {
  Membership,
  IMembership,
} from 'src/database/schemas/membership.schema';

@Injectable()
export class ServerRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // 1) Required roles from metadata
    const required = this.reflector.getAllAndOverride<string[]>(
      SERVER_ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<Request>();

    // 2) Auth user id from session (set by your session middleware/guard)
    const authUserId = (req as any)?.user?.id as string | undefined;
    if (!authUserId) throw new ForbiddenException('Unauthenticated');

    // 3) Get serverId (prefer route param)
    const serverIdParam = (req.params as any)?.serverId;
    const serverId =
      serverIdParam ??
      (req.headers['x-server-id'] as string | undefined) ??
      (req.body as any)?.serverId;
    if (!serverId) throw new NotFoundException('serverId missing');

    // 4) Load membership
    const membership = await Membership.findOne({
      serverId,
      userId: authUserId,
    })
      .select('roles userId serverId') // optional
      .lean<IMembership>() // tell TS the shape
      .exec();

    if (!membership)
      throw new ForbiddenException('Not a member of this server');

    // 5) Role check
    const memberRoles: string[] = membership.roles ?? [];
    const ok = required.some((r) => memberRoles.includes(r));
    if (!ok) throw new ForbiddenException('Insufficient server role');

    // (optional) expose membership downstream
    (req as any).membership = membership;
    return true;
  }
}
