import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Max, Min, IsInt, IsIn } from 'class-validator';
import { ServerTypes } from 'src/database/types';

export class ListServersQueryDto {
  @ApiPropertyOptional({ description: 'free Text search' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ApiPropertyOptional({
    description: 'Select Type ',
    enum: ServerTypes,
    enumName: 'ServerType',
  })
  @IsOptional()
  @IsIn(ServerTypes as unknown as string[])
  type?: string;
}
