import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { type FilterQuery } from 'mongoose';
import slugify from 'slugify';

import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { ListServersQueryDto } from './dto/list-server.query.dto';
import { ServerListResponseDto } from './dto/server-list.dto';
import { ServerViewDto } from './dto/server-view.dto';
import type { IServer } from 'src/database/schemas/server.schema';
import { ServerModel } from 'src/database/schemas/server.schema';
import type { IMembership } from 'src/database/schemas/membership.schema';
import { Membership } from 'src/database/schemas/membership.schema';
import type { IUser } from 'src/database/schemas/user.schema';
import { AppUser } from 'src/database/schemas/user.schema';

type MembershipRoles = Pick<IMembership, 'roles'>;

type UserSuperFlag = Pick<IUser, 'isSuper'>;

@Injectable()
export class ServerService {
  async create(
    ownerId: string | null,
    dto: CreateServerDto,
  ): Promise<ServerViewDto> {
    const slug = slugify(dto.name, { lower: true, strict: true });

    try {
      const server = await ServerModel.create({
        name: dto.name,
        slug,
        ownerId: ownerId ?? undefined,
        icon: dto.icon,
        type: dto.type,
        degreeId: dto.degreeId,
        degreeModuleId: dto.degreeModuleId,
      });
      return this.toServerView(server);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: number }).code === 11000 &&
        'keyPattern' in error &&
        typeof (error as { keyPattern?: Record<string, unknown> })
          .keyPattern === 'object' &&
        (error as { keyPattern?: Record<string, unknown> }).keyPattern?.slug
      ) {
        throw new ConflictException(
          'A server with this name/slug already exists.',
        );
      }
      throw error;
    }
  }

  async update(
    serverId: string,
    actorId: string,
    dto: UpdateServerDto,
  ): Promise<ServerViewDto> {
    const user = await AppUser.findOne({ userId: actorId })
      .select('isSuper')
      .lean<UserSuperFlag | null>();
    const isSuper = user?.isSuper ?? false;

    if (!isSuper) {
      const membership = await Membership.findOne({ serverId, userId: actorId })
        .select('roles')
        .lean<MembershipRoles | null>();
      const roles = membership?.roles ?? [];
      if (!roles.some((role) => role === 'owner' || role === 'admin')) {
        throw new ForbiddenException('Not allowed to edit this server');
      }
    }

    const server = await ServerModel.findByIdAndUpdate(serverId, dto, {
      new: true,
    }).lean<IServer | null>();

    if (!server) throw new NotFoundException('Server not found');
    return this.toServerView(server);
  }

  async findById(serverId: string, actorId: string): Promise<ServerViewDto> {
    const user = await AppUser.findOne({ userId: actorId })
      .select('isSuper')
      .lean<UserSuperFlag | null>();
    const isSuper = user?.isSuper ?? false;

    if (!isSuper) {
      const membership = await Membership.findOne({
        serverId,
        userId: actorId,
      })
        .select('_id')
        .lean<Pick<IMembership, '_id'> | null>();

      if (!membership) {
        throw new ForbiddenException('Not allowed to access this server');
      }
    }

    const server = await ServerModel.findById(serverId).lean<IServer | null>();
    if (!server) {
      throw new NotFoundException('Server not found');
    }

    return this.toServerView(server);
  }

  async remove(serverId: string, actorId: string) {
    const isSuper = true;
    if (!isSuper) {
      const membership = await Membership.findOne({ serverId, userId: actorId })
        .select('roles')
        .lean<MembershipRoles | null>();
      const roles = membership?.roles ?? [];
      if (!roles.some((role) => role === 'owner' || role === 'admin')) {
        throw new ForbiddenException('Not allowed to delete this server');
      }
    }
    await ServerModel.findByIdAndDelete(serverId).exec();
    await Membership.deleteMany({ serverId }).exec();
    return { ok: true } as const;
  }

  private toServerView(doc: IServer): ServerViewDto {
    const toIso = (value: Date | string | undefined): string =>
      new Date(value ?? Date.now()).toISOString();

    const view: ServerViewDto = {
      id: String(doc._id),
      name: doc.name,
      type: doc.type,
      slug: doc.slug,
      degreeId: String(doc.degreeId),
      degreeModuleId: String(doc.degreeModuleId),
      createdAt: toIso(doc.createdAt),
      updatedAt: toIso(doc.updatedAt),
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
    const filter: FilterQuery<IServer> = {};
    if (type) filter.type = type;
    let query = ServerModel.find(filter);

    if (q && q.trim()) {
      const trimmed = q.trim();
      filter.$text = { $search: trimmed };
      query = ServerModel.find(filter)
        .select({ score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    const skip = (page - 1) * pageSize;

    const [docs, total] = await Promise.all([
      query.skip(skip).limit(pageSize).lean<IServer[]>().exec(),
      ServerModel.countDocuments(filter).exec(),
    ]);
    const items = docs.map((item) => this.toServerView(item));
    return {
      items,
      total,
      page,
      pageSize,
    };
  }
}
