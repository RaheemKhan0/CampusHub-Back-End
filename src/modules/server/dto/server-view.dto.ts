import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type ServerType, ServerTypes } from 'src/database/types';

export class ServerViewDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ServerTypes, enumName: 'ServerType' }) type!: ServerType;
  @ApiProperty() slug!: string;
  @ApiPropertyOptional({ description: 'BetterAuth user id when the server has an owner' })
  ownerId?: string;
  @ApiProperty({ required: false }) icon?: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}
