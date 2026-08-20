const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 A iniciar o povoamento da base de dados...');

  // 1. Criar Empresa (Tenant)
  const tenant = await prisma.tenant.upsert({
    where: { taxNumber: '512345678' },
    update: {},
    create: {
      name: 'Hotelequip - Equipamentos Hoteleiros Lda',
      taxNumber: '512345678',
      settings: {
        create: {
          approvalMode: 'APROVACAO_SIMPLES',
          doubleApprovalThreshold: 5000.00,
          autoApproveBelow: 150.00,
          blockOnIbanMismatch: true,
          autoReconcileThreshold: 0.95
        }
      }
    },
  });

  // 2. Criar Utilizador Gerência (Admin)
  const adminUser = await prisma.user.upsert({
    where: { email: 'geral@hotelequip.pt' },
    update: {},
    create: {
      email: 'geral@hotelequip.pt',
      name: 'Rui Medalha (Administração)',
      passwordHash: 'hash_seguro_hotelequip_2026',
      tenants: {
        create: {
          tenantId: tenant.id,
          role: 'ADMIN',
          canViewBanking: true,
          canViewReconciliation: true,
          canViewPayroll: true,
          canExportAccounting: true
        }
      }
    }
  });

  // 3. Criar Fornecedores
  const fornecedores = [
    { name: 'Makro Portugal', taxNumber: '500123456', paymentMethod: 'DEBITO_DIRETO', iban: 'PT50003300001234567890123' },
    { name: 'EDP Comercial', taxNumber: '503504564', paymentMethod: 'DEBITO_DIRETO', iban: 'PT50001800009876543210123' },
    { name: 'Rational Ibérica', taxNumber: '507891234', paymentMethod: 'TRANSFERENCIA_BANCARIA', iban: 'PT50003500004567891230123' },
    { name: 'Galp Frota & Combustíveis', taxNumber: '500109200', paymentMethod: 'CARTAO_CREDITO', iban: 'PT50000700001122334450123' },
  ];

  for (const f of fornecedores) {
    await prisma.supplier.upsert({
      where: { tenantId_taxNumber: { tenantId: tenant.id, taxNumber: f.taxNumber } },
      update: {},
      create: { ...f, tenantId: tenant.id }
    });
  }

  // 4. Criar Documentos / Despesas (Faturas de Exemplo com QR Code AT)
  const doc1 = await prisma.document.create({
    data: {
      tenantId: tenant.id,
      tipo: 'FATURA_FORNECEDOR',
      numeroDoc: 'FT 2026/1042',
      fornecedorCliente: 'Rational Ibérica',
      nif: '507891234',
      dataDoc: new Date('2026-08-10'),
      total: 3450.00,
      iva: 645.16,
      atcud: 'AT-00129-98214',
      qrString: 'A:507891234*B:512345678*C:PT*D:FT*F:20260810*H:AT-00129-98214*N:645.16*O:3450.00',
      fiscalRegime: 'NACIONAL',
      estado: 'PROCESSADO',
      tags: ['EQUIPAMENTOS', 'COZINHA_HOTEL'],
      expense: {
        create: {
          tenantId: tenant.id,
          entityName: 'Rational Ibérica',
          taxNumber: '507891234',
          amount: 3450.00,
          dueDate: new Date('2026-08-30'),
          iban: 'PT50003500004567891230123',
          isPaid: false
        }
      }
    }
  });

  const doc2 = await prisma.document.create({
    data: {
      tenantId: tenant.id,
      tipo: 'FATURA_SERVICO',
      numeroDoc: 'FT EDP-9921',
      fornecedorCliente: 'EDP Comercial',
      nif: '503504564',
      dataDoc: new Date('2026-08-05'),
      total: 420.50,
      iva: 78.63,
      atcud: 'AT-EDP-55412',
      qrString: 'A:503504564*B:512345678*C:PT*D:FT*F:20260805*H:AT-EDP-55412*N:78.63*O:420.50',
      fiscalRegime: 'NACIONAL',
      estado: 'PROCESSADO',
      tags: ['ELETRICIDADE', 'DEBITO_DIRETO'],
      expense: {
        create: {
          tenantId: tenant.id,
          entityName: 'EDP Comercial',
          taxNumber: '503504564',
          amount: 420.50,
          dueDate: new Date('2026-08-20'),
          iban: 'PT50001800009876543210123',
          isPaid: true
        }
      }
    }
  });

  // 5. Criar Movimentos de Extrato Bancário (CGD / Santander)
  await prisma.bankTransaction.createMany({
    data: [
      {
        tenantId: tenant.id,
        importHash: 'tx_cgd_2026_08_01_001',
        date: new Date('2026-08-05'),
        description: 'DEB.DIRETO EDP COMERCIAL SA',
        amount: -420.50,
        balance: 24850.30,
        reference: 'EDP-9921'
      },
      {
        tenantId: tenant.id,
        importHash: 'tx_cgd_2026_08_02_002',
        date: new Date('2026-08-08'),
        description: 'TRF RECEBIDA HOTEL ALGARVE PALACE',
        amount: 8900.00,
        balance: 33750.30,
        reference: 'FT 2026/884'
      }
    ]
  });

  console.log('✅ Base de dados povoada com sucesso para a Hotelequip.pt!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
