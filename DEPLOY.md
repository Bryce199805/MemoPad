# Deployment Guide

## Cloud Server Deployment

### Step 1: Prepare Your Server

Requirements:
- Ubuntu 20.04+ (recommended)
- Docker installed
- Firewall ports: 3000 (API), 80/443 (Web if hosted)

### Step 2: Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Step 3: Upload and Deploy

```bash
# On your server
git clone https://github.com/Bryce199805/MemoPad.git
cd MemoPad

# Start the backend
docker-compose up -d
```

### Step 4: Get API Key

```bash
docker logs memopad-backend
```

Look for output like:
```
========================================
       MemoDesk API Server
========================================
API Key: sk-memo-abc123...
========================================
```

**IMPORTANT**: Save this API Key securely. You'll need it to access the web interface and desktop widget.

### Step 5: Access the API

The API will be available at:
```
http://YOUR_SERVER_IP:3000
```

Test it:
```bash
curl -H "X-API-Key: sk-memo-abc123..." http://YOUR_SERVER_IP:3000/api/stats
```

## Web Interface Deployment

### Option 1: Serve with Nginx

1. Build the web app:
```bash
cd web
npm install
npm run build
```

2. Configure Nginx:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /path/to/MemoPad/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header X-API-Key $http_x_api_key;
    }
}
```

3. Enable and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/MemoPad /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option 2: Serve with Caddy

```Caddyfile
yourdomain.com {
    root * /path/to/MemoPad/web/dist
    file_server

    reverse_proxy /api/* localhost:3000
}
```

## Desktop Widget Configuration

### Configure API URL

1. Run the desktop widget
2. Click the ⚙️ settings button
3. Enter your API Key
4. The widget will automatically connect to `http://YOUR_SERVER_IP:3000`

### Auto-start on Windows

To run widget on Windows startup:

1. Create a shortcut to the executable
2. Press `Win + R`, type `shell:startup`
3. Paste the shortcut

## Security Considerations

### Firewall

Only expose necessary ports:
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP (if serving web)
sudo ufw allow 443   # HTTPS (if using SSL)
sudo ufw allow 3000  # API (consider limiting to your IPs)
```

### SSL/HTTPS

For production, use HTTPS. Options:
- Let's Encrypt (free)
- Cloudflare (free CDN)
- Commercial SSL certificate

### API Key Security

- Never commit `api_key.txt` to version control
- Consider rotating API keys periodically
- Use strong, randomly generated keys

## Monitoring

### Check Container Status

```bash
docker ps
docker logs -f memo-desk-backend
```

### View API Logs

```bash
docker exec memo-desk-backend tail -f /dev/stdout
```

## Backup

### Backup Database

```bash
docker cp memopad-backend:/app/memo.db ./backup-memo.db
```

### Restore Database

```bash
docker cp ./backup-memo.db memopad-backend:/app/memo.db
docker restart memopad-backend
```

## Updating

```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

## Troubleshooting

### Container won't start

Check logs:
```bash
docker logs memopad-backend
```

### API returns 401

- Verify API Key is correct
- Check if key was regenerated (check `api_key.txt` on server)

### Web interface can't connect to API

- Verify CORS settings
- Check if API is running: `curl http://localhost:3000/health`
- Check firewall rules
