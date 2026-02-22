# !/bin/bash

# Update and upgrade system packages
sudo apt update && sudo apt upgrade -y && apt install net-tools -y

# Clone repos
mkdir -p kubot && cd kubot
mkdir -p kucoin binance mexc
cd kucoin && git clone git@github.com:CamaradePopoff/trading-bot.git . && cd ..
cd binance && git clone git@github.com:CamaradePopoff/trading-bot.git . && cd ..
cd mexc && git clone git@github.com:CamaradePopoff/trading-bot.git . && cd ..
cd

# Copy .env files
cp kubot/kucoin/vps/kubot/binance/.env.prod kubot/binance/.env
cp kubot/kucoin/vps/kubot/kucoin/.env.prod kubot/kucoin/.env
cp kubot/kucoin/vps/kubot/mexc/.env.prod kubot/mexc/.env

# Copy certificates
cp kubot/kucoin/vps/etc/ssl/certs/*.* /etc/ssl/certs/
cp kubot/kucoin/vps/etc/ssl/private/*.* /etc/ssl/private/

# Install Node Version Manager (NVM) and Node.js
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
source ~/.bashrc
nvm install 24
nvm use 24

# Setup Nginx
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Setup UFW firewall
sudo ufw --force enable
sudo ufw allow 'OpenSSH'
sudo ufw allow 4000
sudo ufw allow 'Nginx Full'
sudo ufw status

# Obtain SSL certificate from Let's Encrypt (uncomment if you have a domain)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d mykubot.com --non-interactive --agree-tos --email popofxxx@hotmail.com

# If no SSL certificate is available, create a self-signed one
sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout /etc/ssl/private/selfsigned.key -out /etc/ssl/certs/selfsigned.crt -batch -subj "/C=US/ST=State/L=City/O=Organization/CN=mykubot.com"
sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
sudo systemctl restart nginx
sudo ln -sf /etc/nginx/sites-available/kubot /etc/nginx/sites-enabled/

# Copy Nginx configuration
sudo cp kubot/kucoin/vps/etc/nginx/sites-available/kubot /etc/nginx/sites-available/

# Reload the changed configuration:
sudo nginx -t && sudo systemctl reload nginx

# Install pm2 and pm2-logrotate
npm install -g pm2 -y
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Copy bash scripts:
cp kubot/kucoin/vps/*.sh ./
chmod +x *.sh

# Install backend dependencies
sh install.sh
