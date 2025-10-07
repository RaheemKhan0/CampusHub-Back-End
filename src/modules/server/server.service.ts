import { Injectable } from '@nestjs/common';
import { CreateServerDto } from './dto/create-server.dto';
import slugify from 'slugify';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Server } from 'src/database/schemas/server.schema';
import { UpdateServerDto } from './dto/update-server.dto';
import { Membership } from 'src/database/schemas/membership.schema';
import { AppUser } from 'src/database/schemas/user.schema';
import { ListServersQueryDto } from './dto/list-server.query.dto';
import { ServerListResponseDto } from './dto/server-list.dto';
import { ServerViewDto } from './dto/server-view.dto';

@Injectable()
export class ServerService {
  async create(ownerId: string | null, dto: CreateServerDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });

    try {
      const doc = await Server.create({
        name: dto.name,
        slug,
        ownerId: ownerId ?? undefined,
        icon: dto.icon,
        type: dto.type,
      });
      return doc.object();
    } catch (error) {
      if (error?.code === 11000 && error?.keyPattern?.slug) {
        throw new ConflictException(
          'A server with this name/slug already exists.',
        );
      }
      console.error('[Server Create] ', error);
    }
  }

  async update(serverId: string, actorId: string, dto: UpdateServerDto) {
    const user = await AppUser.findOne({ userId: actorId });
    const isSuper = user?.isSuper;

    if (!isSuper) {
      const m = await Membership.findOne({ serverId, userId: actorId }).select(
        'roles',
      );
      if (!m || !m.roles.some((r) => r === 'owner' || r === 'admin')) {
        throw new ForbiddenException('Not allowed to edit this server');
      }
    }
    const server = await Server.findByIdAndUpdate(serverId, dto, { new: true });
    if (!server) throw new NotFoundException('Server not found');
    return server.toObject();
  }

  async findById(serverId: string, actorId: string) {
    const user = await AppUser.findOne({ userId: actorId }).select('isSuper');
    const isSuper = user?.isSuper ?? false;

    if (!isSuper) {
      const membership = await Membership.findOne({
        serverId,
        userId: actorId,
      }).select('_id');

      if (!membership) {
        throw new ForbiddenException('Not allowed to access this server');
      }
    }

    const server = await Server.findById(serverId).lean();
    if (!server) {
      throw new NotFoundException('Server not found');
    }

    return server;
  }

  async remove(serverId: string, actorId: string) {
    const isSuper = true;
    if (!isSuper) {
      const m = await Membership.findOne({ serverId, userId: actorId }).select(
        'roles',
      );
      if (!m || !m.roles.some((r) => r === 'owner' || r === 'admin')) {
        throw new ForbiddenException('Not allowed to delete this server');
      }
    }
    await Server.findByIdAndDelete(serverId);
    await Membership.deleteMany({ serverId }); // cascade
    return { ok: true };
  }

  toServerView(doc: any): ServerViewDto {
    const view: ServerViewDto = {
      id: doc._id,
      name: doc.name,
      type: doc.type,
      slug: doc.slug,
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
    };

    if (doc.ownerId) {
      view.ownerId = doc.ownerId;
    }
    if (doc.icon) {
      view.icon = doc.icon;
    }

    return view;
  }

  async list({
    q,
    page,
    pageSize,
    type,
  }: ListServersQueryDto): Promise<ServerListResponseDto> {
    const filter: any = {};
    if (type) filter.type = type;
    let query = Server.find(filter);

    if (q && q.trim()) {
      filter.$text = { $search: q.trim() };
      query = Server.find(filter)
        .select({ score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    const skip = (page - 1) * pageSize;

    const [doc, total] = await Promise.all([
      query.skip(skip).limit(pageSize).exec(),
      Server.countDocuments(filter).exec(),
    ]);
    const items = doc.map((item) => this.toServerView(item));
    return {
      items,
      total,
      page,
      pageSize,
    };
  }
}
