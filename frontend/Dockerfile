# ============================Base============================
FROM node:alpine AS base

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json .

# Install deps
RUN npm ci --include=dev

# ============================builder============================
FROM node:alpine AS builder
WORKDIR /usr/src/app

# Copy the project
COPY --from=base /usr/src/app/node_modules ./node_modules
COPY . .

# Build the app
RUN npm run build

# ============================Runtime============================
FROM node:alpine

# Set working dir
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY --from=base /usr/src/app/package*.json .
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/.env .

# Expose port 5000
EXPOSE 5000

# Run the app
CMD ["npm", "start"]