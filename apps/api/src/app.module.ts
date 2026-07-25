import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PashuAadharModule } from './pashu-aadhar/pashu-aadhar.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    PashuAadharModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
