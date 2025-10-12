import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import {
  UseGuards,
  UsePipes,
  ValidationPipe,
  Logger,
  Injectable,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';

import { MessagesService } from './messages.service';
import { WsAuthGuard } from 'src/lib/guards/WsAuthGuard';
import { ChannelTargetDto } from './dto/channel-target.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageViewDto } from './dto/message-view.dto';
import { Channel } from 'src/database/schemas/channel.schema';
import { Membership } from 'src/database/schemas/membership.schema';
import { ChannelAccess } from 'src/database/schemas/channel-access.schema';

const DEFAULT_ORIGIN = 'http://localhost:3000';
const channelRoom = (channelId: string) => `channel:${channelId}`;

interface GatewayUser {
  id: string;
  [key: string]: unknown;
}

@UseGuards(WsAuthGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
@WebSocketGateway({
  namespace: 'messages',
  cors: {
    origin: (process.env.CORS_ORIGIN ?? DEFAULT_ORIGIN)
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  },
})
@Injectable()
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(MessagesGateway.name);

  constructor(private readonly messagesService: MessagesService) {}

  @WebSocketServer()
  server!: Server;

  async handleConnection(client: Socket) {
    const user = this.getClientUser(client, false);
    this.logger.debug(
      `Client ${client.id} connected${user ? ` as ${user.id}` : ''}`,
    );
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('channel:join')
  async handleChannelJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChannelTargetDto,
  ) {
    const user = this.getClientUser(client);
    const channel = await this.ensureChannelAccess(
      user.id,
      payload.serverId,
      payload.channelId,
    );

    const room = channelRoom(String(channel._id));
    await client.join(room);

    client.emit('channel:joined', {
      serverId: payload.serverId,
      channelId: payload.channelId,
    });
  }

  @SubscribeMessage('channel:leave')
  async handleChannelLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChannelTargetDto,
  ) {
    const user = this.getClientUser(client);
    await this.ensureChannelAccess(user.id, payload.serverId, payload.channelId);
    const room = channelRoom(payload.channelId);
    await client.leave(room);
    client.emit('channel:left', {
      serverId: payload.serverId,
      channelId: payload.channelId,
    });
  }

  @SubscribeMessage('message:create')
  async handleMessageCreate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto,
  ): Promise<MessageViewDto> {
    const user = this.getClientUser(client);
    await this.ensureChannelAccess(user.id, payload.serverId, payload.channelId);

    const message = await this.messagesService.createMessage(
      payload.serverId,
      payload.channelId,
      payload,
      user.id,
    );

    const room = channelRoom(payload.channelId);
    this.server.to(room).emit('message:created', message);

    return message;
  }

  private getClientUser(client: Socket, enforce = true): GatewayUser {
    const user = (client.data?.user ?? null) as GatewayUser | null;
    if (!user?.id && enforce) {
      throw new WsException('Unauthorized');
    }
    return user ?? { id: '' };
  }

  private async ensureChannelAccess(
    userId: string,
    serverId: string,
    channelId: string,
  ) {
    if (!Types.ObjectId.isValid(channelId)) {
      throw new WsException('Invalid channel id');
    }
    if (!Types.ObjectId.isValid(serverId)) {
      throw new WsException('Invalid server id');
    }

    const channelObjectId = new Types.ObjectId(channelId);
    const serverObjectId = new Types.ObjectId(serverId);

    const channel = await Channel.findOne({
      _id: channelObjectId,
      serverId: serverObjectId,
    })
      .select(['_id', 'serverId', 'privacy'])
      .lean();

    if (!channel) throw new WsException('Channel not found');

    if (channel.privacy === 'public') {
      const membership = await Membership.exists({
        serverId: channel.serverId,
        userId,
        status: 'active',
      });
      if (!membership) throw new WsException('Not a member of this server');
      return channel;
    }

    const membership = await Membership.findOne({
      serverId: channel.serverId,
      userId,
      status: 'active',
    })
      .select('roles')
      .lean();

    const isAdmin =
      !!membership &&
      Array.isArray((membership as any).roles) &&
      ((membership as any).roles.includes('owner') ||
        (membership as any).roles.includes('admin'));

    if (isAdmin) return channel;

    const access = await ChannelAccess.exists({
      channelId: channel._id,
      userId,
    });

    if (!access) throw new WsException('No access to this channel');

    return channel;
  }
}
