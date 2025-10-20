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
import { Channel, IChannel } from 'src/database/schemas/channel.schema';
import type { IMembership } from 'src/database/schemas/membership.schema';
import { Membership } from 'src/database/schemas/membership.schema';
import type { IChannelAccess } from 'src/database/schemas/channel-access.schema';
import { ChannelAccess } from 'src/database/schemas/channel-access.schema';
import type { IServer } from 'src/database/schemas/server.schema';
import { ServerModel } from 'src/database/schemas/server.schema';

const DEFAULT_ORIGIN = 'http://localhost:3000';
const channelRoom = (channelId: string) => `channel:${channelId}`;

type MembershipRoles = Pick<IMembership, 'roles'>;
type MembershipId = Pick<IMembership, '_id'>;
type ChannelAccessLean = Pick<IChannelAccess, '_id'>;

interface GatewayUser {
  id: string;
  name?: string;
  [key: string]: unknown;
}

type GatewaySocket = Socket & { data?: { user?: GatewayUser } };

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
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MessagesGateway.name);

  constructor(private readonly messagesService: MessagesService) {}

  @WebSocketServer()
  server!: Server;

  handleConnection(client: GatewaySocket) {
    const user = this.getClientUser(client, false);
    this.logger.debug(
      `Client ${client.id} connected${user ? ` as ${user.id}` : ''}`,
    );
  }

  handleDisconnect(client: GatewaySocket) {
    this.logger.debug(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('channel:join')
  async handleChannelJoin(
    @ConnectedSocket() client: GatewaySocket,
    @MessageBody() payload: ChannelTargetDto,
  ) {
    this.logger.debug(
      `Client ${client.id} joining server ${payload.serverId} channel ${payload.channelId}`,
    );
    const user = this.getClientUser(client);
    const channel = await this.ensureChannelAccess(
      user.id,
      payload.serverId,
      payload.channelId,
    );

    const room = channelRoom(String(channel._id));
    await client.join(room);

    this.logger.debug(`Client ${client.id} joined room ${room}`);

    client.emit('channel:joined', {
      serverId: payload.serverId,
      channelId: payload.channelId,
    });
  }

  @SubscribeMessage('channel:leave')
  async handleChannelLeave(
    @ConnectedSocket() client: GatewaySocket,
    @MessageBody() payload: ChannelTargetDto,
  ) {
    this.logger.debug(
      `Client ${client.id} leaving server ${payload.serverId} channel ${payload.channelId}`,
    );
    const user = this.getClientUser(client);
    await this.ensureChannelAccess(
      user.id,
      payload.serverId,
      payload.channelId,
    );
    const room = channelRoom(payload.channelId);
    await client.leave(room);
    this.logger.debug(`Client ${client.id} left room ${room}`);
    client.emit('channel:left', {
      serverId: payload.serverId,
      channelId: payload.channelId,
    });
  }

  @SubscribeMessage('message:create')
  async handleMessageCreate(
    @ConnectedSocket() client: GatewaySocket,
    @MessageBody() payload: SendMessageDto,
  ): Promise<MessageViewDto> {
    const user = this.getClientUser(client);
    this.logger.debug(
      `Client ${client.id} creating message in server ${payload.serverId}, channel ${payload.channelId}`,
    );
    await this.ensureChannelAccess(
      user.id,
      payload.serverId,
      payload.channelId,
    );

    const message = await this.messagesService.createMessage(
      payload.serverId,
      payload.channelId,
      payload,
      user.id,
      user.name ?? payload.authorName,
    );

    const room = channelRoom(payload.channelId);
    this.logger.debug(
      `Emitting message ${message.id} to room ${room} from client ${client.id}`,
    );
    this.server.to(room).emit('message:created', message);

    return message;
  }

  private getClientUser(client: GatewaySocket, enforce = true): GatewayUser {
    const socketData = client.data as { user?: GatewayUser } | undefined;
    const user = socketData?.user ?? null;
    if (!user?.id && enforce) {
      throw new WsException('Unauthorized');
    }
    return user ?? { id: '' };
  }

  private async ensureChannelAccess(
    userId: string,
    serverId: string,
    channelId: string,
  ): Promise<IChannel> {
    this.logger.debug(
      `Verifying access for user ${userId} on server ${serverId} channel ${channelId}`,
    );
    if (!Types.ObjectId.isValid(channelId)) {
      this.logger.warn(`Invalid channel id ${channelId}`);
      throw new WsException('Invalid channel id');
    }
    if (!Types.ObjectId.isValid(serverId)) {
      this.logger.warn(`Invalid server id ${serverId}`);
      throw new WsException('Invalid server id');
    }

    const channelObjectId = new Types.ObjectId(channelId);
    const serverObjectId = new Types.ObjectId(serverId);

    const server = await ServerModel.findById(serverId).lean<IServer | null>();

    const channel = await Channel.findOne({
      _id: channelObjectId,
      serverId: serverObjectId,
    })
      .select(['_id', 'serverId', 'privacy'])
      .lean<IChannel>();

    if (!server) {
      this.logger.warn(`Server ${serverId} not found for user ${userId}`);
      throw new WsException('Server not found');
    }
    if (!channel) {
      this.logger.warn(`Channel ${channelId} not found for user ${userId}`);
      throw new WsException('Channel not found');
    }

    if (channel.privacy === 'public') {
      if (server.type === 'unimodules') {
        return channel;
      }
      const membership = await Membership.findOne({
        serverId: channel.serverId,
        userId,
        status: 'active',
      })
        .select('_id')
        .lean<MembershipId | null>();
      if (!membership) {
        this.logger.warn(
          `User ${userId} not a member of server ${serverId} for public channel ${channelId}`,
        );
        throw new WsException('Not a member of this server');
      }
      return channel;
    }

    const membership = await Membership.findOne({
      serverId: channel.serverId,
      userId,
      status: 'active',
    })
      .select('roles')
      .lean<MembershipRoles | null>();

    const roles = membership?.roles ?? [];
    const isAdmin = roles.includes('owner') || roles.includes('admin');

    if (isAdmin) return channel;

    const access = await ChannelAccess.findOne({
      channelId: channel._id,
      userId,
    })
      .select('_id')
      .lean<ChannelAccessLean | null>();

    if (!access) {
      this.logger.warn(
        `User ${userId} lacks access to hidden channel ${channelId} on server ${serverId}`,
      );
      throw new WsException('No access to this channel');
    }

    return channel;
  }
}
