import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { Public } from './common/guards/public.decorator.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Render's health check hits this without the gateway secret.
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
