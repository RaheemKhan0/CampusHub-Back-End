import { CanActivate, ExecutionContext,  Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AuthSessionGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const cookie = req.headers.cookie ?? '';
    if (!cookie) throw new UnauthorizedException('Missing auth cookie');

    const base = process.env.BETTER_AUTH_URL ?? 'http://localhost:4000';
    const r = await fetch(`${base}/api/auth/session`, {
      method: 'GET',
      headers: { Cookie: cookie },
    });

    if (!r.ok) throw new UnauthorizedException('Invalid session');
    const json = await r.json();

    // Attach session user for downstream use (roles, membership, etc.)
    (req as any).user = json?.user;
    return true;
  }
}
