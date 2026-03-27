# Build stage
FROM golang:1.23-alpine AS builder

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

# Copy binary from builder
COPY --from=builder /app/main .

EXPOSE 3000

CMD ["./main"]
