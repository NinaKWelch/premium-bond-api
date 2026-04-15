# ---- Build stage ----
# Compiles TypeScript to JavaScript
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.build.json tsconfig.json ./
COPY src ./src

RUN npm run build

# ---- Production stage ----
# Runs only the compiled output with production dependencies
FROM node:22-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# Create the data directory for store.json (mounted as a volume at runtime)
RUN mkdir -p data

# Run as non-root for security
USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]
