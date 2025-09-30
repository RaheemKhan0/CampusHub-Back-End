import { IsString, IsOptional, IsIn, Length } from "class-validator";
import { ServerTypes } from "src/database/types";

export class CreateServerDto {
  @IsString() @Length(2, 60)
  name! : string;

  @IsString() @IsIn(ServerTypes as unknown as string[])
  type! : typeof ServerTypes[number];

  @IsOptional() @IsString()
  icon? : string;
}
