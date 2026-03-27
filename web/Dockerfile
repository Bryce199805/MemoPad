# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Configure npm registry for faster downloads in China
RUN npm config set registry https://registry.npmmirror.com

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build (API URL will be set at runtime)
RUN npm run build

# Production stage
FROM nginx:1.25-alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
