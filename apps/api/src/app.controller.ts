import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return {
      status: 'online',
      platform: 'DocFlow PT • Hotelequip.pt',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      modules: {
        ocr: 'ready',
        atQrDecoder: 'ready',
        bankingReconciliation: 'ready',
      },
    };
  }
}
