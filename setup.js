const fs = require('fs');
const path = require('path');

const files = {
  'package.json': JSON.stringify({
    name: "gemini-documental",
    private: true,
    workspaces: ["apps/*", "packages/*"],
    scripts: {
      "dev": "turbo run dev",
      "build": "turbo run build",
      "test": "turbo run test",
      "lint": "turbo run lint"
    },
    devDependencies: {
      "prettier": "^3.3.0",
      "turbo": "^2.0.0",
      "typescript": "^5.5.0"
    }
  }, null, 2),

  'turbo.json': JSON.stringify({
    "$schema": "https://turbo.build/schema.json",
    "tasks": {
      "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "!.next/cache/**"] },
      "lint": {},
      "test": { "cache": false },
      "dev": { "cache": false, "persistent": true }
    }
  }, null, 2),

  '.gitignore': `node_modules/
dist/
.next/
.turbo/
.env
.env.local
postgres_data/
redis_data/
*.log`,

  'packages/shared/package.json': JSON.stringify({
    name: "@saas/shared",
    version: "1.0.0",
    main: "src/index.ts",
    types: "src/index.ts"
  }, null, 2),

  'packages/shared/src/index.ts': `export function isValidPortugueseNIF(nif: string): boolean {
  if (!nif || nif.length !== 9 || !/^\\d+$/.test(nif)) return false;
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
}`,

  'apps/web/package.json': JSON.stringify({
    name: "web",
    version: "1.0.0",
    scripts: {
      "dev": "next dev -p 3000",
      "build": "next build",
      "start": "next start -p 3000"
    },
    dependencies: {
      "@saas/shared": "*",
      "next": "^14.2.5",
      "react": "^18.3.1",
      "react-dom": "^18.3.1",
      "lucide-react": "^0.428.0"
    },
    devDependencies: {
      "tailwindcss": "^3.4.7",
      "typescript": "^5.5.0",
      "@types/react": "^18.3.3",
      "@types/node": "^20.14.0"
    }
  }, null, 2),

  'apps/api/package.json': JSON.stringify({
    name: "api",
    version: "1.0.0",
    scripts: {
      "dev": "nest start --watch",
      "build": "nest build",
      "start:prod": "node dist/main.js"
    },
    dependencies: {
      "@saas/shared": "*",
      "@nestjs/common": "^10.3.0",
      "@nestjs/core": "^10.3.0",
      "@prisma/client": "^5.18.0"
    },
    devDependencies: {
      "prisma": "^5.18.0",
      "typescript": "^5.5.0",
      "@types/node": "^20.14.0"
    }
  }, null, 2)
};

console.log('🚀 A gerar estrutura do projeto...');
Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`✔ Criado: ${filePath}`);
});
console.log('\n✨ Todos os ficheiros foram criados com sucesso!');
