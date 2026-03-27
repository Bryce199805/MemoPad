# Installation Guide

## Prerequisites

- **Server**: Any server with Docker
- **Clients**: Windows 10/11 (desktop), any modern browser (web)

## Quick Deploy

```bash
# 1. Clone repository
git clone https://github.com/Bryce199805/MemoPad.git
cd MemoPad

# 2. Start services
docker compose up -d

# 3. Get API Key
docker logs memopad-backend
```

## Access the Application

| Service | URL |
|---------|-----|
| **Web Dashboard** | `http://YOUR_SERVER_IP` (port 80) |
| **Desktop Widget** | Download from [Releases](https://github.com/Bryce199805/MemoPad/releases) |

## Firewall

Only open **port 80**:

```bash
# Ubuntu/Debian
sudo ufw allow 80

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload
```

The backend API (port 3000) is only accessible internally through Nginx proxy.

## Desktop Widget Setup

1. Download from [Releases](https://github.com/Bryce199805/MemoPad/releases)
2. Install and run
3. Click the ⚙ settings button
4. Enter your API Key

## Configuration

### API Key

The API key is auto-generated on first start. Save it securely.

To regenerate: delete `data/api_key.txt` on the server and restart.

### Data Persistence

Data is stored in `./data/` directory:
- `memo.db` - SQLite database
- `api_key.txt` - API key

### Change Web Port

Edit `compose.yml`:

```yaml
services:
  web:
    ports:
      - "8080:80"  # Change 8080 to your desired port
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| API Key required error | Verify the API key is correct |
| Connection refused | Check firewall allows port 80 |
| Desktop widget blank | Set API Key in widget settings |
| Docker container won't start | Run `docker logs memopad-backend` |

For more details, see [DEPLOY.md](DEPLOY.md).
