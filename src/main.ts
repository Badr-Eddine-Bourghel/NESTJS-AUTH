// Importing the .env variables stoked in the memory of my app using ConfigModule
import 'dotenv/config';
// The core NestJS factory class used to create an application instance.
import { NestFactory } from '@nestjs/core';
// Built in tool for validating incoming request bodies against DTO classes
import { ValidationPipe } from '@nestjs/common';
// ConfigService to safely fetch the .env vairables
import { ConfigService } from '@nestjs/config';
// Tools to automatically generate interactive API documentation pages (OpenAPI/Swagger).
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
// Middeleware to read cookies from incoming HTTP request headers
import cookieParser from 'cookie-parser';
// The global error filter
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppModule } from './app.module';

async function bootstrap() {
  // Create the application instance using AppModule
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enabling cookie handling globaly, so Nestjs can read the refresh token restored in a cookie send in the request of a client
  app.use(cookieParser());
  // Add /api to the start of every route URL in my application
  app.setGlobalPrefix('api');
  // Set up strict, global request validation on encomine JSON data
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  const config = new DocumentBuilder()
    .setTitle('NestJs Auth api')
    .setDescription('Complete authentication system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
  console.log(`Application running on http://localhost:${port}/api`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
