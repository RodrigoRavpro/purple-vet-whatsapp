# PurpleVet WhatsApp API Service

API isolada para gerenciamento do WhatsApp usando whatsapp-web.js

## 📁 Estrutura

```
purple-vet-whatsapp/
├── src/
│   ├── index.ts          # Entry point
│   ├── config/           # Configurações
│   │   └── logger.ts
│   ├── services/         # Serviço WhatsApp
│   │   └── whatsappService.ts
│   ├── routes/           # Rotas HTTP
│   │   └── whatsapp.ts
│   ├── middleware/       # Auth e validações
│   │   └── auth.ts
│   └── types/            # TypeScript types
│       └── whatsapp.ts
├── docker-compose.yml
├── Dockerfile
├── package.json
└── tsconfig.json
```

## 🚀 Como executar

### Desenvolvimento Local

```bash
npm install
npm run dev
```

### Docker

```bash
docker-compose up -d
```

## 🔌 Endpoints

- `POST /api/whatsapp/initialize` - Inicializar cliente WhatsApp (gerar QR Code)
- `GET /api/whatsapp/status` - Status da conexão
- `GET /api/whatsapp/qr` - Obter QR Code
- `POST /api/whatsapp/send` - Enviar mensagem
- `POST /api/whatsapp/send-media` - Enviar mídia
- `POST /api/whatsapp/disconnect` - Desconectar cliente

## 🔐 Variáveis de Ambiente

```env
PORT=3001
NODE_ENV=production
API_SECRET=your_secret_key_here
```

## 📝 Notas

- O serviço roda de forma isolada do purple-api principal
- Usa autenticação local (LocalAuth) para manter sessão
- QR Code é gerado apenas na primeira inicialização
- Após autenticado, mantém sessão persistente
