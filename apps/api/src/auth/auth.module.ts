import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthNestModule } from '@thallesp/nestjs-better-auth';
import { auth } from './better-auth.config';

@Module({
  imports: [
    BetterAuthNestModule.forRoot({
      auth,
      disableGlobalAuthGuard: true,
    }),
  ],
})
export class AuthModule {}
