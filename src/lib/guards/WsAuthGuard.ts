import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { auth } from '../betterauth';
import { convertIncomingHttpHeaders } from '../utils/convertIncomingHttpHeaders';


@Injectable()
export class WsAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket & { data?: any }>();
    if (!client) throw new WsException('Invalid socket context');

    if (client.data?.user?.id) return true;

    const clientheaders = client.handshake?.headers;
    const convertedClientHeaders = convertIncomingHttpHeaders(clientheaders);
    const session = await auth.api.getSession({
      headers: convertedClientHeaders,
    });

    if (!session) throw new WsException('Unauthorized');

    return true;
  }
}
