# MODVC Speedtest - Setup Guide

## Quick Setup Steps

### 1. Install Dependencies
```bash
# Make sure you have Node.js 12+ and npm
cd /home/ubuntu/speedtest
npm install
```

### 2. Install PM2 Globally
```bash
sudo npm install -g pm2
```

### 3. Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the command it outputs
```

### 4. Set Up Nginx
```bash
# Copy the nginx config
sudo cp nginx.conf /etc/nginx/sites-available/test.modvc.org

# Enable the site
sudo ln -s /etc/nginx/sites-available/test.modvc.org /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 5. Get SSL Certificate with Certbot
```bash
# Install certbot if not installed
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Get the certificate
sudo certbot --nginx -d test.modvc.org

# It will automatically update nginx config
```

---

## PM2 Commands

| Command | Description |
|---------|-------------|
| `pm2 start ecosystem.config.js` | Start the app |
| `pm2 stop modvc-speedtest` | Stop the app |
| `pm2 restart modvc-speedtest` | Restart the app |
| `pm2 logs modvc-speedtest` | View logs |
| `pm2 status` | Check status |
| `pm2 monit` | Monitor in real-time |

---

## DNS Configuration
Your DNS is already configured:
- `test.modvc.org` → `51.79.146.131`

After completing the steps above, access your site at:
**https://test.modvc.org**
