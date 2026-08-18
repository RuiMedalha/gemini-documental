const fs = require('fs');
const path = require('path');

const files = {
  // 1. Configuração Raiz com packageManager
  'package.json': JSON.stringify({
    name: "gemini-documental",
    private: true,
    packageManager: "npm@10.8.0",
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

  // 2. Package Shared
  'packages/shared/package.json': JSON.stringify({
    name: "@saas/shared",
    version: "1.0.0",
    main: "src/index.ts",
    types: "src/index.ts"
  }, null, 2),

  'packages/shared/tsconfig.json': JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "commonjs",
      declaration: true,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true
    },
    include: ["src/**/*"]
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

  // 3. Frontend Next.js (Dashboard Executivo & Layout)
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

  'apps/web/tsconfig.json': JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      plugins: [{ name: "next" }],
      paths: { "@/*": ["./src/*"] }
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"]
  }, null, 2),

  'apps/web/next.config.mjs': `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@saas/shared"]
};
export default nextConfig;`,

  'apps/web/src/app/layout.tsx': `import React from 'react';

export const metadata = {
  title: 'DocFlow PT • Hotelequip.pt',
  description: 'Gestão Documental, Fiscal e Conciliação Bancária',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#030712', color: '#f8fafc' }}>
        {children}
      </body>
    </html>
  );
}`,

  'apps/web/src/app/page.tsx': `'use client';
import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Scale, Landmark, Zap, QrCode, FileText } from 'lucide-react';

export default function Dashboard() {
  const [synced] = useState(true);

  return (
    <main style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid #1e293b', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: '#38bdf8' }}>
            HOTELEQUIP.PT • DocFlow Enterprise
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
            Gestão Documental, Conciliação Bancária & Faturação Moloni / TOConline
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span style={{ padding: '6px 12px', background: '#0c4a6e', color: '#38bdf8', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>
            Agosto 2026
          </span>
          <span style={{ padding: '6px 12px', background: '#064e3b', color: '#34d399', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>
            ● Sistema Online
          </span>
        </div>
      </header>

      {/* Grid de KPIs */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>FATURAÇÃO EMITIDA</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#f8fafc', margin: '8px 0' }}>48.250,00 €</div>
          <div style={{ color: '#34d399', fontSize: '12px' }}>+18.4% vs mês anterior</div>
        </div>

        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>COMPRAS & ENCARGOS</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#f8fafc', margin: '8px 0' }}>29.800,00 €</div>
          <div style={{ color: '#f87171', fontSize: '12px' }}>PT, UE (RITI) e DUA</div>
        </div>

        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>ESTIMATIVA DE IVA (AT)</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#fbbf24', margin: '8px 0' }}>4.243,50 €</div>
          <div style={{ color: '#94a3b8', fontSize: '12px' }}>A entregar no dia 15</div>
        </div>

        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>CONCILIAÇÃO BANCÁRIA</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#38bdf8', margin: '8px 0' }}>94%</div>
          <div style={{ color: '#34d399', fontSize: '12px' }}>47 de 50 Movimentos</div>
        </div>
      </section>

      <section style={{ background: '#0f172a', padding: '24px', borderRadius: '16px', border: '1px solid #1e293b' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 16px', color: '#f8fafc' }}>
          Documentos Recentes & Inbox Fiscal
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
          Todos os módulos (OCR, Leitor QR Code AT, TOConline e Conciliação SEPA) estão prontos para processar faturas.
        </p>
      </section>
    </main>
  );
}`,

  // 4. Backend NestJS (Main Entry & AppModule)
  'apps/api/tsconfig.json': JSON.stringify({
    compilerOptions: {
      module: "commonjs",
      declaration: true,
      removeComments: true,
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
      allowSyntheticDefaultImports: true,
      target: "ES2022",
      sourceMap: true,
      outDir: "./dist",
      baseUrl: "./",
      skipLibCheck: true,
      strictNullChecks: false,
      noImplicitAny: false,
      strictBindCallApply: false,
      forceConsistentCasingInFileNames: false,
      noFallthroughCasesInSwitch: false
    }
  }, null, 2),

  'apps/api/src/app.module.ts': `import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule {}`,

  'apps/api/src/main.ts': `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  await app.listen(3001);
  console.log('🚀 DocFlow API NestJS a correr em http://localhost:3001/api');
}
bootstrap();`
};

console.log('🚀 A atualizar estrutura e a configurar packageManager...');
Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log(`✔ Criado/Atualizado: ${filePath}`);
});
console.log('\n✨ Configuração concluída com sucesso!');
