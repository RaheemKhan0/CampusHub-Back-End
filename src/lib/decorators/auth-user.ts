import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const UserAuth = createParamDecorator((_data, ctx : ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as { id : string; email : string } | undefined;
})
