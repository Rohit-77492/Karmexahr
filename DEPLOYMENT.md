# KarmexaHR — Deployment & Custom Domain Setup Guide

## Deployment Options

### Option 1: Vercel + Supabase Hosted (Recommended)

#### Step 1 — Supabase Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Initialize (already done — uses existing supabase/ directory)
# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations in order
supabase db push

# Optionally seed with demo data
supabase db seed --file supabase/seed.sql
```

#### Step 2 — Vercel Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Login and deploy
vercel login
vercel

# For production
vercel --prod
```

Set the following environment variables in Vercel Dashboard → Settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL          = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     = eyJ...
SUPABASE_SERVICE_ROLE_KEY         = eyJ...
SUPABASE_JWT_SECRET               = your-jwt-secret
NEXT_PUBLIC_APP_URL               = https://app.karmexahr.com
RESEND_API_KEY                    = re_live_...
RAZORPAY_KEY_ID                   = rzp_live_...
RAZORPAY_KEY_SECRET               = ...
NEXT_PUBLIC_SENTRY_DSN            = https://...@sentry.io/...
ENCRYPTION_SECRET                 = 32-char-random-string
```

#### Step 3 — Custom Domain on Vercel
1. Vercel Dashboard → Your Project → Settings → Domains
2. Add domain: `app.karmexahr.com`
3. Add DNS records at your registrar:

```
Type    Name    Value
CNAME   app     cname.vercel-dns.com
```

Or for root domain (`karmexahr.com`):
```
Type    Name    Value
A       @       76.76.21.21
```

#### Step 4 — Supabase Auth URLs
In Supabase Dashboard → Authentication → URL Configuration:
```
Site URL:         https://app.karmexahr.com
Redirect URLs:    https://app.karmexahr.com/**
```

---

### Option 2: Self-Hosted (Docker Compose)

#### Prerequisites
- Ubuntu 22.04 VPS (minimum 4GB RAM, 2 vCPU)
- Docker & Docker Compose installed
- A domain pointing to your server

#### Setup
```bash
# Clone the repository
git clone https://github.com/your-org/karmexahr.git
cd karmexahr

# Copy and configure environment
cp .env.example .env
# Edit .env with your actual values

# Generate JWT secret
openssl rand -base64 32

# Start the full stack
docker compose up -d

# Check status
docker compose ps
docker compose logs app --tail=50
```

#### Nginx Reverse Proxy (for custom domain)
```nginx
server {
    listen 80;
    server_name app.karmexahr.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.karmexahr.com;

    ssl_certificate     /etc/letsencrypt/live/app.karmexahr.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.karmexahr.com/privkey.pem;

    # Next.js app
    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Supabase API gateway (Kong)
    location /supabase/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Get SSL certificate
certbot --nginx -d app.karmexahr.com

# Restart nginx
systemctl restart nginx
```

---

### Option 3: Vercel + Self-Hosted Supabase

Use Vercel for the Next.js frontend but run Supabase on your own server for data sovereignty:

1. Deploy Supabase via Docker Compose on your VPS
2. Set `NEXT_PUBLIC_SUPABASE_URL=https://your-vps-domain.com/supabase`
3. Deploy Next.js to Vercel normally
4. Configure CORS in Supabase to allow your Vercel domain

---

## CI/CD with GitHub Actions

The included workflow at `.github/workflows/ci-cd.yml` handles:

| Trigger         | Actions |
|----------------|---------|
| Any PR          | TypeCheck → Lint → Tests → Preview Deploy |
| Push to `main`  | TypeCheck → Lint → Tests → Production Deploy → DB Migrate |

#### Required GitHub Secrets
```
VERCEL_TOKEN          = vercel_...
VERCEL_ORG_ID         = team_...
VERCEL_PROJECT_ID     = prj_...
PROD_DB_URL           = postgresql://postgres:password@db.supabase.co:5432/postgres
STAGING_SUPABASE_URL  = https://staging-project.supabase.co
STAGING_SUPABASE_ANON_KEY = ...
STAGING_SERVICE_ROLE_KEY  = ...
```

---

## Google SSO Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
   - `http://localhost:54321/auth/v1/callback` (for local dev)
4. In Supabase Dashboard → Auth → Providers → Google:
   - Enable Google provider
   - Add Client ID and Client Secret

---

## Monitoring Setup

### Sentry
1. Create project at [sentry.io](https://sentry.io)
2. Copy DSN to `NEXT_PUBLIC_SENTRY_DSN`
3. Add `SENTRY_AUTH_TOKEN` for source maps upload

### Vercel Analytics
- Enabled automatically when deployed to Vercel
- View at vercel.com → Your Project → Analytics

---

## Backup Strategy

### Supabase Hosted
- Automatic daily backups included on Pro plan
- Point-in-time recovery available on Enterprise

### Self-Hosted Backup Script
```bash
#!/bin/bash
# backup.sh — Run daily via cron
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U postgres -h localhost -d postgres \
  --no-owner --no-privileges \
  > /backups/karmexahr_${DATE}.sql

# Upload to S3
aws s3 cp /backups/karmexahr_${DATE}.sql \
  s3://your-backup-bucket/karmexahr/

# Keep only last 30 days locally
find /backups -name "*.sql" -mtime +30 -delete
```

```bash
# Add to crontab
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

---

## Performance Checklist

- [ ] Enable Supabase connection pooling (PgBouncer)
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` to use pooled endpoint for server-side
- [ ] Enable Vercel Edge Network caching for static assets
- [ ] Add `pgvector` extension for AI features (optional)
- [ ] Configure Supabase read replicas for analytics queries
- [ ] Enable ISR (Incremental Static Regeneration) for public pages

---

## Security Checklist

- [ ] Rotate all JWT secrets and API keys on first production deploy
- [ ] Enable 2FA on Supabase dashboard account
- [ ] Configure Supabase row-level security (already done via migrations)
- [ ] Enable Supabase audit logging
- [ ] Set `ENCRYPTION_SECRET` to a unique 32-char string
- [ ] Review and restrict Supabase storage bucket policies
- [ ] Enable Vercel Web Application Firewall (WAF)
- [ ] Add Content Security Policy headers (configured in `next.config.ts`)
