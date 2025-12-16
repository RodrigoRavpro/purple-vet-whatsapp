# PurpleVet WhatsApp Cloud API Service

API isolada para envio de mensagens via **WhatsApp Business Cloud API** (API oficial do Meta)

## 🎯 Características

- ✅ Usa API oficial do WhatsApp (não requer QR Code)
- ✅ Envio de mensagens de texto com links
- ✅ Preview automático de links
- ✅ Envio de templates aprovados (notificações)
- ✅ Validação de entrada com Joi
- ✅ Rate limiting
- ✅ Logs estruturados com Winston
- ✅ Docker containerizado

## 📁 Estrutura

```
purple-vet-whatsapp/
├── src/
│   ├── index.ts          # Entry point + Express server
│   ├── config/           # Configurações
│   │   └── logger.ts     # Winston logger
│   ├── services/         # Serviço WhatsApp Cloud API
│   │   └── whatsappService.ts
│   ├── routes/           # Rotas HTTP
│   │   └── whatsapp.ts   # Endpoints da API
│   └── middleware/       # Autenticação
│       └── auth.ts       # API Key middleware
├── docker-compose.yml
├── Dockerfile
├── package.json
└── tsconfig.json
```

## 🚀 Como executar

### 1. Configurar WhatsApp Business API

Acesse: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started

1. Crie um app no Meta for Developers
2. Adicione WhatsApp ao app
3. Obtenha:
   - `Access Token` (permanente)
   - `Phone Number ID`
   - `Business Account ID`

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env`:
```env
PORT=3001
NODE_ENV=production
API_SECRET=your_api_secret_here

# WhatsApp Cloud API
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
```

### 3. Desenvolvimento Local

```bash
npm install
npm run dev
```

### 4. Docker

```bash
docker-compose up -d
```

## 🔌 Endpoints

### GET `/api/whatsapp/status`
Verifica se a API está configurada

**Response:**
```json
{
  "success": true,
  "isConfigured": true,
  "phoneNumberId": "12345678...",
  "apiVersion": "v18.0"
}
```

### POST `/api/whatsapp/send`
Envia mensagem de texto (com ou sem link)

**Headers:**
```
X-API-Key: your_api_secret_here
```

**Body:**
```json
{
  "recipientPhone": "+5511999999999",
  "message": "Olá! Seu exame está disponível.",
  "linkUrl": "https://purplevet.com.br/exame/abc123",
  "linkPreview": true,
  "recipientName": "João Silva"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "wamid.HBgNNTUxMTk..."
}
```

### POST `/api/whatsapp/send-link`
Atalho para enviar apenas um link

**Body:**
```json
{
  "recipientPhone": "+5511999999999",
  "linkUrl": "https://purplevet.com.br/exame/abc123",
  "message": "Seu exame está pronto! Acesse:"
}
```

### POST `/api/whatsapp/send-template`
Envia mensagem usando template aprovado

**Body:**
```json
{
  "recipientPhone": "+5511999999999",
  "templateName": "exam_ready",
  "languageCode": "pt_BR",
  "parameters": ["João", "Ultrassom"]
}
```

## 🔐 Autenticação

Todas as rotas `/api/whatsapp/*` requerem API Key no header:

```bash
curl -X POST http://localhost:3001/api/whatsapp/send \
  -H "X-API-Key: your_api_secret_here" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientPhone": "+5511999999999",
    "message": "Teste",
    "linkUrl": "https://example.com"
  }'
```

## 📝 Formato de Telefone

O serviço aceita vários formatos e normaliza automaticamente:

- `11999999999` → `5511999999999`
- `+55 11 99999-9999` → `5511999999999`
- `(11) 99999-9999` → `5511999999999`

Se não tiver código do país, adiciona `55` (Brasil) automaticamente.

## 🔄 Integração com Purple API

No `purple-api`, faça requisições HTTP:

```typescript
const axios = require('axios');

await axios.post('http://purple-vet-whatsapp:3001/api/whatsapp/send', {
  recipientPhone: patient.phone,
  message: 'Seu exame está disponível!',
  linkUrl: `https://purplevet.com.br/exame/${examId}`,
}, {
  headers: {
    'X-API-Key': process.env.WHATSAPP_API_SECRET
  }
});
```

## 📊 Logs

```bash
# Ver logs em tempo real
docker-compose logs -f

# Logs salvos em arquivos
- error.log (apenas erros)
- combined.log (todos os logs)
```

## 🧪 Testar

```bash
# Verificar status
curl http://localhost:3001/health

# Verificar configuração
curl http://localhost:3001/api/whatsapp/status \
  -H "X-API-Key: your_api_secret"

# Enviar teste
curl -X POST http://localhost:3001/api/whatsapp/send \
  -H "X-API-Key: your_api_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientPhone": "+5511999999999",
    "message": "Teste de envio",
    "linkUrl": "https://purplevet.com.br"
  }'
```

## ⚠️ Limites da API do WhatsApp

- **Conversas iniciadas por empresa**: Requer template aprovado nas primeiras 24h
- **Após resposta do usuário**: Pode enviar mensagens livres por 24h
- **Rate limits**: Verifique os limites da sua conta no Meta Business

## 🔗 Links Úteis

- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Criar Templates](https://business.facebook.com/wa/manage/message-templates/)
- [Rate Limits](https://developers.facebook.com/docs/whatsapp/cloud-api/overview#throughput)

## 📦 Dependências Principais

- `express` - Servidor HTTP
- `axios` - Cliente HTTP para WhatsApp API
- `joi` - Validação de dados
- `winston` - Logging estruturado
- `helmet` - Segurança HTTP
- `cors` - CORS habilitado

## 🐛 Troubleshooting

**Erro: WhatsApp Cloud API não está configurada**
- Verifique se todas as variáveis `WHATSAPP_*` estão no `.env`

**Erro 401 da API do WhatsApp**
- Access Token inválido ou expirado
- Regenere o token no Meta for Developers

**Erro 400: Invalid phone number**
- Verifique o formato do número
- Certifique-se que tem WhatsApp ativo
