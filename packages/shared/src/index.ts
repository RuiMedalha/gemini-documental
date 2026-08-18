export function isValidPortugueseNIF(nif: string): boolean {
  if (!nif || nif.length !== 9 || !/^\d+$/.test(nif)) return false;
  const validFirstDigits = ['1', '2', '3', '5', '6', '8', '9'];
  if (!validFirstDigits.includes(nif[0])) return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(nif[i], 10) * (9 - i);
  }
  const remainder = sum % 11;
  const checkDigit = remainder === 0 || remainder === 1 ? 0 : 11 - remainder;
  return checkDigit === parseInt(nif[8], 10);
}

export interface ATParsedQR {
  nifIssuer?: string;
  nifRecipient?: string;
  country?: string;
  docType?: string;
  docDate?: string;
  atcud?: string;
  taxTotal?: number;
  totalWithTax?: number;
}

export function parseATQRCode(qrString: string): ATParsedQR | null {
  if (!qrString || !qrString.includes('*')) return null;
  const fields = qrString.split('*');
  const result: ATParsedQR = {};
  for (const field of fields) {
    const [key, ...valParts] = field.split(':');
    const val = valParts.join(':');
    switch (key) {
      case 'A': result.nifIssuer = val; break;
      case 'B': result.nifRecipient = val; break;
      case 'C': result.country = val; break;
      case 'D': result.docType = val; break;
      case 'F': result.docDate = val; break;
      case 'H': result.atcud = val; break;
      case 'N': result.taxTotal = parseFloat(val); break;
      case 'O': result.totalWithTax = parseFloat(val); break;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}
