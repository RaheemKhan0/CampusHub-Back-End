import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import morgan from 'morgan';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/betterauth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  app.useLogger(['log', 'error', 'warn', 'debug', 'verbose']);
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(morgan('dev'));
  // Better Auth routes
  expressApp.all('/api/auth', toNodeHandler(auth));

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();
