import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ApiService } from './api.service';
import { ApiController } from './api.controller';
import { ConfigModule } from '@nestjs/config';
import config from '../config/suppliers.api.config'

@Module({
  imports: [HttpModule, ConfigModule.forRoot({
    load: [config],
  })],
  providers: [ApiService],
  controllers: [ApiController],
})
export class ApiModule {}
