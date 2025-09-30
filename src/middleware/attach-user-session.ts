import type { Request, Response, NextFunction } from 'express';

export default async function attachUserSession(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const path = req.path;
    if (path.startsWith('api/auth')) next();

    const cookie = req.headers.cookie;
    if (!cookie) return next();

    const base = process.env.BETTER_AUTH_URL ?? 'http://localhost:4000';
    const r = await fetch(`${base}/api/auth/session`, {
      method: 'GET',
      headers: { Cookie: cookie },
    });

    if (r.ok) {
      const json = await r.json();
      (req as any).user = json?.user;
    }
  } catch (error) {
    console.log("[middleware] [attachUserSession] " ,error);
  }
  next();
}
