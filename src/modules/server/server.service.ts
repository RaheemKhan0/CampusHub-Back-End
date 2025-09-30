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

@Injectable()
export class ServerService {
  async create(ownerId: string, dto: CreateServerDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });

    try {
      const doc = await Server.create({
        name: dto.name,
        slug,
        ownerId,
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
    const isSuper = false;
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
}
