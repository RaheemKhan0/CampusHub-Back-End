import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { auth } from '../betterauth';
import { convertIncomingHttpHeaders } from '../utils/convertIncomingHttpHeaders';

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket & { data?: any }>();

    this.logger.debug(`Authenticating websocket client ${client.id}`);

    if (client.data?.session?.user?.id) {
      this.logger.debug(
        `Client ${client.id} already authenticated as ${client.data.session.user.id}`,
      );
      return true;
    }

    const headers = client.handshake?.headers;
    if (!headers) {
      this.logger.warn(`Missing handshake headers for client ${client.id}`);
      throw new WsException('Unauthorized');
    }

    const convertedHeaders = convertIncomingHttpHeaders(headers);

    let session: UserSession | null = null;
    try {
      this.logger.debug(`Fetching session for client ${client.id}`);
      session = (await auth.api.getSession({ headers: convertedHeaders })) as
        | UserSession
        | null;
    } catch (error) {
      this.logger.error(
        `Session lookup failed for client ${client.id}: ${(error as Error).message}`,
      );
      throw new WsException('Unauthorized');
    }

    if (!session?.user?.id) {
      this.logger.warn(`No valid session for client ${client.id}`);
      throw new WsException('Unauthorized');
    }

    client.data = {
      ...(client.data ?? {}),
      session,
      user: session.user,
    };

    this.logger.debug(
      `Attached session for user ${session.user.id} to client ${client.id}`,
    );

    return true;
  }
}
