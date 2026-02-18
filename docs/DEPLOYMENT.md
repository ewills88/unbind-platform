# Deployment Guide

## Prerequisites

- Node.js 20+
- npm 10+
- Vercel CLI (`npm install -g vercel`)
- Access to Supabase project
- AWS credentials (for backups, optional)

## Environment Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in all required environment variables

3. Set up Vercel environment variables:
   ```bash
   vercel env pull
   ```

## Deployment

### Staging
```bash
npm run deploy:staging
```

### Production
```bash
npm run deploy:production
```

### Skip Tests (Emergency)
```bash
npm run deploy:production -- --skip-tests
```

## Database Migrations

### Run Pending Migrations
```bash
npm run db:migrate
```

### Check Migration Status
```bash
npm run db:migrate:status
```

### Create New Migration
```bash
npm run db:migrate:create <migration_name>
```

### Rollback Last Migration
```bash
npm run db:migrate:down
```

## Backups

### Create Local Backup
```bash
npm run backup:local
```

### Create S3 Backup
```bash
npm run backup
```

### Restore from Backup
```bash
npm run restore <backup-path>
```

## Rollback

If a deployment fails:
```bash
npm run rollback:production
```

For staging:
```bash
npm run rollback:staging
```

## Docker

### Build and Run
```bash
docker-compose up -d
```

### Build Only
```bash
docker build -t unbind-web .
```

## Monitoring

- Health check: `GET /api/health`
- Readiness probe: `GET /api/health/ready`
- Liveness probe: `GET /api/health/live`
- Metrics: `GET /api/metrics`
- Sentry dashboard: Configure `SENTRY_DSN` env var

## CI/CD Pipeline

The project uses GitHub Actions with the following workflows:

- **ci.yml**: Runs on all PRs and pushes to main/develop
  - Lint & type check
  - Unit tests with coverage
  - Integration tests (with Redis service)
  - E2E tests (Playwright)
  - Security scan
  - Build verification

- **deploy-staging.yml**: Auto-deploys develop branch to staging
- **deploy-production.yml**: Auto-deploys main branch to production with rollback on failure

## Troubleshooting

### Common Issues

1. **Build fails**: Check environment variables are set correctly
2. **Migrations fail**: Verify `SUPABASE_DB_URL` is correct
3. **Health check fails**: Check external service connections (Supabase, Redis, Stripe)
4. **TypeScript OOM**: Set `NODE_OPTIONS=--max-old-space-size=4096`

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": { "status": "healthy", "latency": 5 },
    "redis": { "status": "healthy", "latency": 2 },
    "storage": { "status": "healthy", "latency": 10 },
    "stripe": { "status": "healthy", "latency": 100 },
    "email": { "status": "healthy", "latency": 50 }
  }
}
```
