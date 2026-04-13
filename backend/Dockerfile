FROM node:20-alpine

# Install OpenSSL (required by Prisma)
RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app

COPY package.json ./
# Copia o schema antes do install para que o postinstall (prisma generate) funcione
COPY prisma ./prisma
# Use --include=dev to ensure devDependencies (ts-jest, jest, etc.) are installed
# even when NODE_ENV=production is set at runtime
RUN npm install --include=dev --legacy-peer-deps

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

RUN mkdir -p uploads logs

EXPOSE 3001

CMD sh -c "npx prisma db push && npx tsx src/seed.ts; node dist/index.js"
