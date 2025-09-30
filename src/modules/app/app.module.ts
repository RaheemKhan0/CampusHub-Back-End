import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthGuard, AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from 'src/lib/betterauth';
import { APP_GUARD } from '@nestjs/core';
import { ServerModule } from '../server/server.module';

@Module({
  imports: [AuthModule.forRoot(auth), ServerModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
