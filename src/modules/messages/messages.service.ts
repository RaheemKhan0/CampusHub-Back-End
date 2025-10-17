import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import { Messages } from 'src/database/schemas/message.schema';
import { Channel, IChannel } from 'src/database/schemas/channel.schema';
import { CreateMessageDto } from './dto/message-create.dto';
import { MessageViewDto } from './dto/message-view.dto';
import { MessageListResponseDto } from './dto/message-list-response.dto';
import { IMessage } from 'src/database/schemas/message.schema';

const MAX_PAGE_SIZE = 100;

@Injectable()
export class MessagesService {
  async createMessage(
    serverId: string,
    channelId: string,
    dto: CreateMessageDto,
    userId: string,
    authorName?: string,
  ): Promise<MessageViewDto> {
    if (!userId) throw new UnauthorizedException('Missing user context');

    if (!Types.ObjectId.isValid(channelId) || !Types.ObjectId.isValid(serverId)) {
      throw new NotFoundException('Channel not found');
    }

    const channelObjectId = new Types.ObjectId(channelId);
    const serverObjectId = new Types.ObjectId(serverId);

    const channel = await Channel.findOne({
      _id: channelObjectId,
      serverId: serverObjectId,
    }).select('_id');
    if (!channel) throw new NotFoundException('Channel not found');

    const resolvedAuthorName = authorName ?? dto.authorName;
    if (!resolvedAuthorName) {
      throw new UnauthorizedException('Missing author name');
    }

    const now = new Date();
    const doc = await Messages.create({
      channelId: channel._id,
      authorId: userId,
      content: dto.content,
      authorName: resolvedAuthorName,
      attachments: dto.attachments ?? [],
      mentions: dto.mentions ?? [],
      createdAt: now,
      updatedAt: now,
    });

    return this.toMessageView(doc.toObject());
  }

  async listMessages(
    serverId: string,
    channelId: string,
    params: { page?: number; pageSize?: number },
  ): Promise<MessageListResponseDto> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, params.pageSize ?? 50),
    );

    if (!Types.ObjectId.isValid(channelId) || !Types.ObjectId.isValid(serverId)) {
      throw new NotFoundException('Channel not found');
    }

    const channelObjectId = new Types.ObjectId(channelId);
    const serverObjectId = new Types.ObjectId(serverId);

    const channel = await Channel.findOne({
      _id: channelObjectId,
      serverId: serverObjectId,
    })
      .select('_id')
      .lean<IChannel>();
    if (!channel) throw new NotFoundException('Channel not found');

    const query = Messages.find({ channelId: channel._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<IMessage[]>();

    const [items, total] = await Promise.all([
      query,
      Messages.countDocuments({ channelId: channel._id }),
    ]);

    const ordered = items.reverse();

    return {
      items: ordered.map((doc) => this.toMessageView(doc)),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  private toMessageView(doc: any): MessageViewDto {
    return {
      id: String(doc._id),
      channelId: String(doc.channelId),
      authorId: doc.authorId,
      authorName: doc.authorName,
      content: doc.content,
      attachments: doc.attachments ?? [],
      mentions: doc.mentions ?? [],
      editedAt: doc.editedAt ? new Date(doc.editedAt).toISOString() : undefined,
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
    };
  }
}
