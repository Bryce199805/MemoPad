# Build stage
FROM golang:1.23-alpine AS builder

# Configure Go proxy for faster downloads in China
ENV GOPROXY=https://goproxy.cn,direct

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build (no CGO needed with pure Go SQLite driver)
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Final stage
FROM alpine:latest

WORKDIR /app

# Install runtime dependencies
RUN apk --no-cache add ca-certificates

# Create data directory
RUN mkdir -p /app/data

# Copy binary from builder
COPY --from=builder /app/main .

# Environment variables
ENV DATA_DIR=/app/data
ENV GIN_MODE=release

EXPOSE 3000

CMD ["./main"]
