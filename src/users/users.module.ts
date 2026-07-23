import { Module } from '@nestjs/common';
import { UsersServce } from './users.service';

@Module({
  providers: [UsersServce],
  exports: [UsersServce],
})
export class UsersModule {}
