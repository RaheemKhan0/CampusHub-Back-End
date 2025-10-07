import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface SessionUser {
  id: string;
  string: string;
  isSuper: boolean;
}

export const UserAuth = createParamDecorator(
  (_data, ctx: ExecutionContext): SessionUser | undefined => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as SessionUser | undefined;
  },
);
