import { Module } from '@nestjs/common';

// ConfigModule is a nestjs built in way to load my '.env' in the memory when the application starts
// and inject '.env' variables anywhere in my app using ConfigService, so I can use this line of code
// this.configService.get('JWT_ACCESS_SECRET') to get my JWT_ACCESS_SECRET
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { JwtModule } from '@nestjs/jwt';
import { RolesGuard } from './common/guards/roles.guard';
import { TasksModule } from './tasks/tasks.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    // Global setup for ConfigModule
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available everywhere without re-importing
      expandVariables: true, // The option give us the possibility to use ${any .env variable} and it wont be treated as string
    }),
    JwtModule.register({ global: true }),
    UsersModule,
    AuthModule,
    TasksModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
