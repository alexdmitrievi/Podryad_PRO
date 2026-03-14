#!/bin/bash
# Initial SSL certificate setup for n8n.podryad.pro
# Run this ONCE on a fresh VPS before starting docker-compose

set -e

DOMAIN="n8n.podryad.pro"
EMAIL="admin@podryad.pro"

echo "=== Подряд PRO: SSL Setup ==="
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"

# Create directories
mkdir -p certbot/conf certbot/www

# Get initial certificate
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  -p 80:80 \
  certbot/certbot certonly \
    --standalone \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

echo "=== SSL certificate obtained! ==="
echo "Now run: docker-compose up -d"
