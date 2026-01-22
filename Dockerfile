# ---------- Stage 1: Build ----------
FROM node:20-alpine AS builder

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy full project
COPY . .

# Build NestJS project (generates dist folder)
RUN npm run build


# ---------- Stage 2: Production ----------
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy dist output from builder
COPY --from=builder /usr/src/app/dist ./dist

# Copy package.json and lock file
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Expose port
EXPOSE 8080
ENV PORT=8080

# Start the application
CMD ["node", "dist/main.js"]
