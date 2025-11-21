import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });

  // Configure body parser to accept larger payloads (10MB for images)
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ limit: '10mb', extended: true }));

  // Serve static files from public directory
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Enable CORS
  app.enableCors({
    origin: '*', // Configure this based on your needs
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Set global prefix for API routes only
  app.setGlobalPrefix('api', {
    exclude: ['/'], // Exclude root path so static files work
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Test Interface: http://localhost:${port}`);
  logger.log(`Webhook endpoint: http://localhost:${port}/api/webhook/whatsapp`);
}
bootstrap();
