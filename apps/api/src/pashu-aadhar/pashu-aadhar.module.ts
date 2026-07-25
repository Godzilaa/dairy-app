import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PashuAadharService } from './pashu-aadhar.service';
import { PashuAadharController } from './pashu-aadhar.controller';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [PashuAadharService],
  controllers: [PashuAadharController],
  exports: [PashuAadharService],
})
export class PashuAadharModule {}
