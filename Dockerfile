FROM node:20-alpine

WORKDIR /app

# 1) deps
COPY package*.json ./
RUN npm install

# 2) copiar prisma para poder generar el client
COPY prisma ./prisma
RUN npx prisma generate

# 3) copiar el resto del código
COPY . .

# 4) build de Nest
RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
