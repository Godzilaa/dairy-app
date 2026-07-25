import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PashuAadharService {
  private readonly logger = new Logger(PashuAadharService.name);
  private readonly apiBaseUrl = 'https://bharatpashudhan-api.ndlm.co.in/epashu/v1';
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly enabled: boolean;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.enabled = this.configService.get('PASHU_AADHAR_API_ENABLED') === 'true';
    this.apiKey = this.configService.get('PASHU_AADHAR_API_KEY', '');
    this.apiSecret = this.configService.get('PASHU_AADHAR_API_SECRET', '');
  }

  async lookup(tagId: string): Promise<any> {
    if (!this.enabled) {
      return {
        tagId,
        message: 'Bharat Pashudhan API not configured. Email project.office@ndlm.co.in for access.',
      };
    }
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiBaseUrl}/animal/${tagId}`, {
          headers: {
            'X-API-Key': this.apiKey,
            'X-API-Secret': this.apiSecret,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }),
      );
      return this.transformResponse(response.data);
    } catch (error: any) {
      this.logger.error(`Failed Pashu Aadhar lookup ${tagId}: ${error.message}`);
      throw error;
    }
  }

  private transformResponse(data: any): any {
    return {
      tagId: data.tagId || data.animalId || data.id,
      species: data.species,
      breed: data.breed,
      name: data.animalName || data.name,
      dob: data.dateOfBirth || data.dob,
      gender: data.gender || data.sex,
      ownerName: data.ownerName || data.farmerName,
      ownerPhone: data.ownerPhone || data.farmerPhone,
      village: data.village,
      district: data.district,
      state: data.state,
    };
  }
}
