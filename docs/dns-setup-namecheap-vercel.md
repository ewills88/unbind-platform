# DNS Setup: Namecheap → Vercel for unbind.law

## Prerequisites
- Vercel project connected to the `ewills88/unbind-platform` repo
- Domain `unbind.law` purchased on Namecheap
- Vercel Pro or Team plan (custom domains with SSL)

---

## Step 1: Add Domain in Vercel

1. Go to your Vercel project → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter: `unbind.law`
4. Vercel will show the DNS records you need to set

Also add:
- `www.unbind.law` (Vercel will auto-redirect www → apex)

---

## Step 2: Configure DNS in Namecheap

1. Log in to **Namecheap** → **Domain List** → click **Manage** on `unbind.law`
2. Go to the **Advanced DNS** tab
3. Delete any existing A records, AAAA records, or CNAME records for `@` and `www`

### Add these records:

| Type  | Host  | Value              | TTL       |
|-------|-------|--------------------|-----------|
| A     | @     | `76.76.21.21`      | Automatic |
| CNAME | www   | `cname.vercel-dns.com.` | Automatic |

> The A record `76.76.21.21` is Vercel's global anycast IP.
> Vercel may also show a second A record — add both if provided.

### Optional: If Vercel shows an AAAA record, also add:

| Type  | Host | Value                  | TTL       |
|-------|------|------------------------|-----------|
| AAAA  | @    | (Vercel-provided IPv6) | Automatic |

---

## Step 3: Verify in Vercel

1. Go back to Vercel → **Settings** → **Domains**
2. Wait 1-5 minutes for DNS propagation
3. Vercel will show a green checkmark when DNS is verified
4. If it shows "Invalid Configuration", double-check:
   - No conflicting DNS records (especially parking pages or Namecheap default records)
   - CNAME for `www` points to `cname.vercel-dns.com.` (with trailing dot)

---

## Step 4: SSL Certificate

- Vercel automatically provisions a **free SSL certificate** via Let's Encrypt
- This happens automatically after DNS verification — no action needed
- Certificate covers both `unbind.law` and `www.unbind.law`
- Auto-renews before expiration

---

## Step 5: Verify Everything Works

1. Visit `https://unbind.law` — should load the app with a padlock icon
2. Visit `https://www.unbind.law` — should redirect to `https://unbind.law`
3. Visit `http://unbind.law` — should redirect to `https://unbind.law`
4. Check headers: `curl -I https://unbind.law` should show:
   - `Strict-Transport-Security: max-age=63072000`
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`

---

## Step 6: Update Supabase Auth Redirect

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://unbind.law`
3. Add to **Redirect URLs**:
   - `https://unbind.law/**`
   - `https://unbind.law/portal/auth/callback`
   - `https://unbind.law/api/integrations/google/callback`

---

## Step 7: Update Environment Variables in Vercel

Make sure these are set in Vercel → Settings → Environment Variables:
- `NEXT_PUBLIC_APP_URL` = `https://unbind.law`
- `GOOGLE_REDIRECT_URI` = `https://unbind.law/api/integrations/google/callback`
- `QUICKBOOKS_REDIRECT_URI` = `https://unbind.law/api/integrations/quickbooks/callback`
- `EMAIL_FROM` = `noreply@unbind.law`
- `EMAIL_REPLY_TO` = `support@unbind.law`

---

## Step 8: Email DNS (for Resend)

If using Resend for transactional email from `@unbind.law`:

1. In Resend dashboard, add domain `unbind.law`
2. Add the DNS records Resend provides (typically DKIM + SPF):

| Type  | Host                        | Value                    |
|-------|-----------------------------|--------------------------|
| TXT   | @                           | `v=spf1 include:resend.com ~all` |
| CNAME | resend._domainkey           | (Resend-provided value)  |
| TXT   | _dmarc                      | `v=DMARC1; p=none;`     |

---

## Troubleshooting

**DNS not propagating?**
- Use https://dnschecker.org to verify records globally
- Namecheap can take up to 30 minutes; usually 2-5 minutes

**"Invalid Configuration" in Vercel?**
- Make sure Namecheap DNS management is set to "Namecheap BasicDNS" (not custom nameservers)
- Remove any "URL Redirect Record" or "CNAME Record" for `@` that Namecheap adds by default

**SSL not issuing?**
- Vercel needs DNS to resolve first. Wait 10 minutes after DNS verification.
- If stuck, go to Vercel Domains and click "Refresh" on the SSL status.
