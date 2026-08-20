import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private inMemoryDocs: any[] = [];
  private inMemoryFolders: any[] = [
    { id: 'f1', name: 'Equipamentos & Máquinas', description: 'Faturas de equipamentos', color: 'emerald' },
    { id: 'f2', name: 'Manutenção & Peças', description: 'Assistência técnica e componentes', color: 'blue' },
    { id: 'f3', name: 'Consumíveis & Produtos', description: 'Detergentes, stock e consumíveis', color: 'amber' },
    { id: 'f4', name: 'Instalações & Energia', description: 'Água, luz e comunicações', color: 'purple' },
    { id: 'f5', name: 'Proformas & Orçamentos', description: 'Documentos pendentes de fatura final', color: 'amber' },
    { id: 'f6', name: 'Fornecedores Espanha / UE', description: 'Compras Comunitárias Intracomunitárias', color: 'cyan' },
  ];

  getDocuments() {
    return this.inMemoryDocs;
  }

  saveDocument(data: any) {
    const doc = {
      ...data,
      id: data.id || 'DOC-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    this.inMemoryDocs.unshift(doc);
    return { success: true, document: doc };
  }

  updatePaymentStatus(id: string, updateData: any) {
    const index = this.inMemoryDocs.findIndex(d => d.id === id);
    if (index !== -1) {
      this.inMemoryDocs[index] = { ...this.inMemoryDocs[index], ...updateData };
      return { success: true, document: this.inMemoryDocs[index] };
    }
    return { success: false, message: 'Documento não encontrado' };
  }

  getFolders() {
    return this.inMemoryFolders;
  }

  createFolder(data: any) {
    const folder = {
      id: 'f-' + Date.now(),
      name: data.name,
      description: data.description || 'Pasta criada pelo utilizador',
      color: data.color || 'emerald'
    };
    this.inMemoryFolders.push(folder);
    return folder;
  }

  processBankStatement(csvText: string) {
    const lines = csvText.split('\n').filter(l => l.trim().length > 0);
    const parsedTransactions: any[] = [];

    for (const line of lines) {
      const parts = line.split(/[;,]/);
      if (parts.length >= 2) {
        const date = parts[0]?.trim();
        const desc = parts[1]?.trim();
        const rawAmount = parts[2]?.trim().replace('€', '').replace(',', '.') || '0';
        const amount = Math.abs(parseFloat(rawAmount));

        if (!isNaN(amount) && amount > 0) {
          // Cruzamento inteligente com faturas
          const matchedDoc = this.inMemoryDocs.find(
            d => Math.abs(d.totalAmount - amount) < 0.05 || (desc && d.supplierName && desc.toLowerCase().includes(d.supplierName.toLowerCase().split(' ')[0]))
          );

          parsedTransactions.push({
            id: 'TX-' + Math.random().toString(36).substr(2, 9),
            date,
            description: desc,
            amount,
            matchedDocId: matchedDoc?.id || null,
            matchedDocNumber: matchedDoc?.docNumber || null,
            isMatched: !!matchedDoc
          });
        }
      }
    }
    return { transactions: parsedTransactions, totalCount: parsedTransactions.length };
  }

  generateSepaPaymentFile(data: { documentIds: string[]; debtorIban: string; debtorName: string }) {
    const selected = this.inMemoryDocs.filter(d => data.documentIds.includes(d.id) && d.iban);
    const totalAmount = selected.reduce((sum, d) => sum + d.totalAmount, 0);
    const msgId = 'DOCFLOW-SEPA-' + Date.now();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">\n`;
    xml += `  <CstmrCdtTrfInitn>\n    <GrpHdr>\n      <MsgId>${msgId}</MsgId>\n      <CreDtTm>${new Date().toISOString()}</CreDtTm>\n      <NbOfTxs>${selected.length}</NbOfTxs>\n      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>\n      <InitgPty><Nm>${data.debtorName || 'DOCFLOW CLIENTE'}</Nm></InitgPty>\n    </GrpHdr>\n`;
    xml += `    <PmtInf>\n      <PmtInfId>LOT-${Date.now()}</PmtInfId>\n      <PmtMtd>TRF</PmtMtd>\n      <Dbtr><Nm>${data.debtorName || 'DOCFLOW CLIENTE'}</Nm></Dbtr>\n      <DbtrAcct><Id><IBAN>${(data.debtorIban || 'PT50000000000000000000000').replace(/\s+/g, '')}</IBAN></Id></DbtrAcct>\n`;

    for (const doc of selected) {
      xml += `      <CdtTrfTxInf>\n        <PmtId><EndToEndId>${doc.docNumber.replace(/[^a-zA-Z0-9]/g, '')}</EndToEndId></PmtId>\n        <Amt><InstdAmt Ccy="EUR">${doc.totalAmount.toFixed(2)}</InstdAmt></Amt>\n        <Cdtr><Nm>${doc.supplierName}</Nm></Cdtr>\n        <CdtrAcct><Id><IBAN>${doc.iban.replace(/\s+/g, '')}</IBAN></Id></CdtrAcct>\n        <RmtInf><Ustrd>Liquidacao ${doc.docNumber} NIF ${doc.supplierNif}</Ustrd></RmtInf>\n      </CdtTrfTxInf>\n`;
    }

    xml += `    </PmtInf>\n  </CstmrCdtTrfInitn>\n</Document>`;
    return { xmlContent: xml, filename: `SEPA_PAGAMENTOS_${new Date().toISOString().split('T')[0]}.xml`, totalCount: selected.length, totalAmount };
  }
}
