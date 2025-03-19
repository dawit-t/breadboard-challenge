import { Controller, Get } from '@nestjs/common';
import { ApiService } from './api.service';
import { AggregatedPart } from '../dto/aggregated-part.dto';

@Controller()
export class ApiController {
  constructor(private apiService: ApiService) {
  }

  @Get('suppliers/aggregated')
  getSupplierData(): Promise<AggregatedPart> {
    return this.apiService.fetchSuppliersData();
  }
}