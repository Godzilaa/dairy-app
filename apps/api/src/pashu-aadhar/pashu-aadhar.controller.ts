import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { PashuAadharService } from './pashu-aadhar.service';
import type { Request } from 'express';

@Controller('api/pashu-aadhar')
export class PashuAadharController {
  constructor(private pashuAadharService: PashuAadharService) {}

  @Get('lookup/:tagId')
  @UseGuards(AuthGuard)
  async lookup(@Param('tagId') tagId: string, @Req() req: Request) {
    return this.pashuAadharService.lookup(tagId);
  }
}
