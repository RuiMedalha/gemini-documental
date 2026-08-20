import { Controller, Get, Post, Body, Param, Put, Delete, Header } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return { status: 'healthy', version: '2.0.0', time: new Date().toISOString() };
  }

  // Documentos
  @Get('documents')
  getAllDocuments() {
    return this.appService.getDocuments();
  }

  @Post('documents')
  createDocument(@Body() data: any) {
    return this.appService.saveDocument(data);
  }

  @Put('documents/:id/payment')
  togglePayment(@Param('id') id: string, @Body() data: any) {
    return this.appService.updatePaymentStatus(id, data);
  }

  // Pastas
  @Get('folders')
  getFolders() {
    return this.appService.getFolders();
  }

  @Post('folders')
  createFolder(@Body() data: any) {
    return this.appService.createFolder(data);
  }

  // Conciliação Bancária
  @Post('reconciliation/parse-statement')
  reconcileStatement(@Body() body: { statementRows: string }) {
    return this.appService.processBankStatement(body.statementRows);
  }

  // Gerador de Ficheiro SEPA XML
  @Post('sepa/generate')
  generateSepaXml(@Body() body: { documentIds: string[]; debtorIban: string; debtorName: string }) {
    return this.appService.generateSepaPaymentFile(body);
  }
}
