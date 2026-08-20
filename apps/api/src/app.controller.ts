import { Controller, Get, Post, Body } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return {
      status: 'online',
      platform: 'DocFlow PT • Hotelequip.pt',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      modules: { ocr: 'ready', atQrDecoder: 'ready', cameraScanner: 'ready' },
    };
  }

  @Get('documents')
  async getDocuments() {
    return prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  @Post('documents')
  async createDocument(@Body() data: any) {
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: { name: 'Hotelequip Lda', taxNumber: '512345678' }
      });
    }

    const doc = await prisma.document.create({
      data: {
        tenantId: tenant.id,
        tipo: data.tipo || 'FATURA_FORNECEDOR',
        numeroDoc: data.numeroDoc || 'FT ' + Date.now().toString().slice(-6),
        fornecedorCliente: data.fornecedorCliente || 'Fornecedor Identificado',
        nif: data.nif || '999999990',
        dataDoc: data.dataDoc ? new Date(data.dataDoc) : new Date(),
        total: data.total ? parseFloat(data.total) : 0,
        iva: data.iva ? parseFloat(data.iva) : 0,
        atcud: data.atcud || 'AT-ONLINE-VALIDATED',
        qrString: data.qrString || null,
        estado: 'PROCESSADO',
        tags: data.tags || ['SCAN_CAMARA', 'AUTOMATICO'],
      }
    });

    return { success: true, document: doc };
  }
}