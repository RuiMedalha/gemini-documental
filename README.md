# ⚡ DocFlow PT — Gestão Documental, Inteligência Fiscal & Automação de Tesouraria

> Plataforma SaaS *Enterprise* concebida para o mercado empresarial português (Hotelequip.pt), combinando leitura instantânea de **QR Code AT / ATCUD**, **Reconciliação Bancária Universal**, **SEPA XML ISO 20022**, **Escudo Anti-Fraude**, **Portal do Contabilista**, **Análise de Frotas & Salários** e **Copiloto IA**.

---

## 🌟 Principais Funcionalidades

### 🏛️ 1. Fiscalidade Portuguesa & Internacional
* **Descodificador de QR Code AT & ATCUD:** Extração imediata de NIF emissor/adquirente, bases tributáveis e taxas de IVA (23%, 13%, 6%) sem erros de OCR.
* **Regimes Fiscais:** Suporte a faturas Nacionais (PT), Intracomunitárias (UE — RITI com *Reverse Charge*) e Importações Extra-UE (DUA / Alfândega).
* **Conetores Contabilísticos:** Exportação em lote para **TOConline (OCC)**, **Primavera / Cegid v10**, **PHC CS Web**, **Sage 50c** e validador estrutural de ficheiros **SAF-T (PT)**.
* **Dossier Mensal Automatizado:** Geração de ficheiro `.ZIP` organizado por pastas fiscais com mapa de conferência em Excel (`.xlsx`).

### 💳 2. Banca, Pagamentos & Conciliação Inteligente
* **Compatibilidade Bancária Universal:** Importação de extratos via CSV, **CAMT.053 XML** e agregação direta via **Open Banking (PSD2)** para todos os bancos nacionais (CGD, BCP, Santander, Novo Banco, BPI, Montepio, Revolut, Wise).
* **Emissão de Lotes SEPA XML:** Geração de ficheiros `pain.001.001.03` para pagamento agrupado a fornecedores e ordenados no *Homebanking*.
* **Identificação de Débitos Diretos:** Separação automática entre fornecedores com débito em conta (EDP, Makro, Água, Telecomunicações) e transferências manuais.
* **Gateways Digitais:** Recebimentos em tempo real via **Ifthenpay (MB WAY e Referências Multibanco)** com validação de chave criptográfica.

### 🛡️ 3. Governação, Permissões Granulares & Anti-Fraude
* **Controlo de Visibilidade por Perfil (RBAC):**
  * **Gerência (`ADMIN`):** Acesso irrestrito a saldos bancários, ordenados, margens e aprovações.
  * **Contabilista (`CONTABILIDADE`):** Acesso ao arquivo fiscal, conferência de IVA e integração TOConline.
  * **Recursos Humanos (`GESTOR_RH`):** Acesso a processamento salarial, retenções de IRS e TSU.
  * **Operador / Técnico (`OPERADOR`):** Acesso apenas a conferência de encomendas e upload de despesas no terreno (**saldos bancários e valores monetários confidenciais são ocultados/mascarados**).
* **Políticas de Aprovação Flexíveis:** Escolha nas definições entre **Sem Aprovação** (fluxo rápido), **Aprovação Simples** ou **Dupla Aprovação** (ativada apenas acima de determinado montante configurável).
* **Escudo Anti-Fraude de IBAN:** Deteção e bloqueio de faturas com IBAN divergente do histórico registado do fornecedor (*Vendor Impersonation*).
* **Livro de Auditoria Imutável:** Registo de logs com assinatura criptográfica encadeada (SHA-256 *Hash-Chaining*).

### 👥 4. Recursos Humanos, Frotas & Simulação Fiscal
* **Processamento Salarial & Encargos:** Cálculo de salários líquidos, retenções na fonte de IRS (DMR à AT), Segurança Social (TSU 23,75% + 11%) e emissão de lote SEPA de ordenados.
* **Gestão de Frotas & Cartões:** Imputação automática de despesas de combustível e portagens (Via Verde) a matrículas de viaturas.
* **Simulador Fiscal Trimestral:** Previsão em tempo real da Declaração Periódica do IVA (Campos 1 a 88) e estimativa de IRC / Tributações Autónomas.

### 🤖 5. Copiloto IA & Omnicanalidade
* **Visão Multimodal:** Extração semântica de faturas internacionais complexas e DUAs.
* **Chat Analítico de Tesouraria:** Perguntas em linguagem natural sobre fluxo de caixa, despesas e impostos.
* **Ingestão Omnicanal:** Upload por Web, Scanner PWA móvel com filtro térmico e modo *offline*, Email Inbound e **Bot de WhatsApp Business**.
* **Pesquisa Híbrida:** Pesquisa global por NIF, nome, número de documento e pesquisa semântica com IA.

---

## 🏗️ Arquitetura do Monorepo

gemini-documental/
├── apps/
│   ├── api/                    # Backend NestJS (REST API, BullMQ, Prisma, WebSockets)
│   │   ├── src/
│   │   │   ├── common/         # Guards (JWT, Tenant, Permissões, ApiKey), Decorators
│   │   │   ├── modules/
│   │   │   │   ├── ai/         # Copiloto IA (Visão, Chat RAG)
│   │   │   │   ├── audit/      # Auditoria Hash-Chaining SHA-256
│   │   │   │   ├── banking/    # Parser CAMT.053, SEPA XML, Previsão de Tesouraria
│   │   │   │   ├── documents/  # Gestão documental, OCR Textract, QR AT
│   │   │   │   ├── export/     # Exportador ZIP/Excel, Validador SAF-T
│   │   │   │   ├── fleet/      # Frotas e Cartões Corporativos
│   │   │   │   ├── integrations/# TOConline, Primavera, PHC, Sage, Ifthenpay, WhatsApp
│   │   │   │   ├── payroll/    # Recursos Humanos, Salários e Encargos
│   │   │   │   ├── reconciliation/ # Motor de conciliação heurístico
│   │   │   │   ├── search/     # Pesquisa Full-Text (PostgreSQL GIN) e Semântica
│   │   │   │   ├── security/   # Escudo Anti-Fraude de IBAN
│   │   │   │   └── tax-simulator/ # Simulador IVA e IRC
│   │   │   ├── prisma/         # Schema multi-tenant e script de seed
│   │   │   └── main.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── web/                    # Frontend Next.js 14 (App Router, Tailwind CSS, PWA)
│       ├── public/             # Service Worker, Manifest PWA
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/     # Login e Autenticação Passkeys (WebAuthn)
│       │   │   └── (dashboard)/# Dashboard Executivo, Inbox, Conciliação, RH, Portal Contabilista
│       │   ├── components/     # Command Palette (Cmd+K), Scanner Térmico, Copiloto IA
│       │   └── lib/
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   └── shared/                 # Validador NIF PT (Módulo 11), Parser QR Code AT, Tipos partilhados
│
├── docker-compose.yml          # Ambiente de desenvolvimento local
├── docker-compose.prod.yml     # Orquestração de produção com Caddy (HTTPS automático)
├── Caddyfile                   # Configuração de Reverse Proxy com SSL Let's Encrypt
└── turbo.json                  # Pipeline Turborepo
