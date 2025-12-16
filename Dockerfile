FROM node:20-alpine

WORKDIR /app

# Copiar package.json e instalar dependências
COPY package*.json ./
RUN npm install --production

# Copiar código-fonte
COPY . .

# Build TypeScript
RUN npm run build

# Expor porta
EXPOSE 3001

# Variáveis de ambiente
ENV NODE_ENV=production \
    PORT=3001

# Comando de inicialização
CMD ["npm", "start"]
