// src/database/types.ts
import { Types } from 'mongoose';

export type ObjId = Types.ObjectId;

export const ChannelTypes = ['text', 'qa'] as const;
export type ChannelType = (typeof ChannelTypes)[number];

export const RoleTypes = ['owner', 'admin', 'moderator', 'member'] as const;
export type Role = (typeof RoleTypes)[number];

export const ServerTypes = ['unimodules', 'citysocieties', 'personal'] as const;
export type ServerType = (typeof ServerTypes)[number];

export const NotificationTypes = ['mention', 'invite', 'system'] as const;
export type NotificationType = (typeof NotificationTypes)[number];

export const PRIVACY = ['public', 'hidden'] as const;

export const MembershipStatusTypes = ['active', 'banned', 'left'] as const;
export type MembershipStatus = (typeof MembershipStatusTypes)[number];

export const AuditActions = [
  'server.create',
  'server.update',
  'server.delete',
  'channel.create',
  'channel.update',
  'channel.delete',
  'message.create',
  'message.update',
  'message.delete',
  'member.invite',
  'member.join',
  'member.leave',
  'member.kick',
  'thread.create',
  'thread.resolve',
] as const;
export type AuditAction = (typeof AuditActions)[number];
