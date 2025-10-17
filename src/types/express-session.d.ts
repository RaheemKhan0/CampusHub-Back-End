import 'express-serve-static-core';
import type { UserSession } from '@thallesp/nestjs-better-auth';

declare module 'express-serve-static-core' {
  interface Request {
    /**
     * Better Auth session attached by the AuthGuard
     */
    session?: UserSession;
    /**
     * Convenience reference to the session user (Better Auth attaches this too)
     */
    user?: UserSession['user'];
  }
}
