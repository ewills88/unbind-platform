# Unbind Launch Checklist

Pre-launch checklist for the Unbind divorce collaboration platform.

## Environment Configuration

- [ ] All environment variables set in production
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] `OPENAI_API_KEY`
  - [ ] `RESEND_API_KEY`
  - [ ] `REDIS_URL`
  - [ ] `APP_VERSION`
- [ ] Environment variables are not exposed in client bundles
- [ ] `.env.local` is in `.gitignore`
- [ ] Production URLs configured (no localhost references)

## Database & Migrations

- [ ] All 44 migrations applied successfully
- [ ] RLS policies verified on all tables
- [ ] Database backups configured and tested
- [ ] Point-in-time recovery enabled
- [ ] Seed data loaded for help center content
- [ ] Database connection pooling configured
- [ ] Query performance verified (no N+1 queries)

## Security Review

- [ ] Authentication flow tested (login, register, logout, password reset)
- [ ] Authorization checks on all API routes
- [ ] RLS policies tested for all user roles
- [ ] CORS configuration reviewed
- [ ] CSP headers configured
- [ ] Rate limiting enabled on public endpoints
- [ ] Input validation on all API routes (Zod schemas)
- [ ] SQL injection protection verified
- [ ] XSS protection verified
- [ ] CSRF protection verified
- [ ] File upload validation (type, size limits)
- [ ] Sensitive data not logged
- [ ] Error messages don't leak implementation details
- [ ] API keys rotated from development values
- [ ] Two-factor authentication available

## Performance

- [ ] Lighthouse score > 90 on key pages
- [ ] Core Web Vitals within targets
  - [ ] LCP < 2.5s
  - [ ] FID < 100ms
  - [ ] CLS < 0.1
- [ ] Image optimization enabled (next/image)
- [ ] Static pages pre-rendered where possible
- [ ] API response times < 500ms (p95)
- [ ] Database query times < 100ms (p95)
- [ ] Redis caching configured for frequent queries
- [ ] Bundle size analyzed and optimized
- [ ] Gzip/Brotli compression enabled

## Monitoring & Observability

- [ ] Health check endpoint (`/api/health`) responding
- [ ] Metrics endpoint (`/api/metrics`) collecting data
- [ ] Error tracking configured (error_logs table)
- [ ] Uptime monitoring configured
- [ ] Alert thresholds set
  - [ ] Error rate > 1%
  - [ ] Response time > 2s
  - [ ] Database connection failures
  - [ ] Disk usage > 80%
- [ ] Log aggregation configured
- [ ] Dashboard for key metrics created

## Backup & Recovery

- [ ] Automated database backups (daily)
- [ ] Backup retention policy (30 days)
- [ ] Backup restoration tested
- [ ] Document storage backups configured
- [ ] Disaster recovery plan documented
- [ ] Recovery time objective (RTO) defined
- [ ] Recovery point objective (RPO) defined

## Legal & Compliance

- [ ] Terms of Service published (`/legal/terms`)
- [ ] Privacy Policy published (`/legal/privacy`)
- [ ] Cookie consent implemented
- [ ] Data processing agreements with vendors
- [ ] CCPA compliance verified
- [ ] Attorney-client privilege protections documented
- [ ] Data retention policies defined
- [ ] IOLTA trust accounting compliance verified
- [ ] Bar association requirements reviewed per state

## Content & Help Center

- [ ] Help categories and articles seeded
- [ ] FAQs populated
- [ ] Onboarding checklists configured (attorney + client)
- [ ] Feature tours created
- [ ] API documentation published (`/help/api`)
- [ ] Contact support email configured
- [ ] Knowledge base search working

## Testing

- [ ] Unit tests passing (`npm run test:unit`)
- [ ] Integration tests passing (`npm run test:integration`)
- [ ] E2E tests passing (`npm run test:e2e`)
- [ ] Security tests passing (`npm run test:security`)
- [ ] Accessibility tests passing (`npm run test:a11y`)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive testing
- [ ] Load testing completed
- [ ] User acceptance testing completed

## Deployment

- [ ] CI/CD pipeline configured and tested
- [ ] Staging environment validated
- [ ] Production deployment script tested
- [ ] Rollback procedure documented and tested
- [ ] DNS configuration verified
- [ ] SSL certificate installed and valid
- [ ] CDN configured for static assets
- [ ] Domain redirects configured (www → non-www)

## Beta Testing Plan

- [ ] Beta signup page live (`/beta`)
- [ ] Beta invitation email template created
- [ ] Beta user onboarding flow tested
- [ ] Feedback collection mechanism in place
- [ ] Bug reporting process documented
- [ ] Beta user communication plan
- [ ] Beta metrics tracking (signups, activation, retention)
- [ ] Beta exit criteria defined

## Go-Live Steps

1. [ ] Final staging validation
2. [ ] Database migration on production
3. [ ] Seed help center content
4. [ ] Deploy application to production
5. [ ] Verify health check endpoint
6. [ ] Smoke test critical flows
   - [ ] User registration
   - [ ] Case creation
   - [ ] Document upload
   - [ ] Invoice generation
   - [ ] Client portal access
7. [ ] Enable monitoring alerts
8. [ ] Update DNS records
9. [ ] Verify SSL certificate
10. [ ] Send beta invitations
11. [ ] Monitor error rates for 24 hours
12. [ ] Celebrate launch! 🎉
