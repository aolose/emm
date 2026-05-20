# Cloudflare Turnstile Anti-Crawl Setup

When using Cloudflare Turnstile to protect your site, legitimate automated visitors such as search engine crawlers will also be blocked since they don't execute JavaScript. To ensure SEO crawlers can access your site, complete the following Cloudflare Transform Rule configuration before enabling Turnstile.

## Prerequisites

- Your site is proxied through Cloudflare (DNS records have the orange cloud enabled)
- You have admin access to your Cloudflare account

## Step 1: Create a Transform Rule

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your site
3. Go to **Rules → Transform Rules → Modify Request Header**
4. Click **Create rule**
5. Configure as follows:

| Field | Value |
|---|---|
| Rule name | `Add Verified Bot Headers` |
| When (Field) | Bot |
| When (Operator) | equals |
| When (Value) | Known Bots |
| Then (Action) | Set static |
| Header name | `X-Verified-Bot-Category` |
| Header value | `cf.verified_bot_category` |
| Then (Action) | Set static |
| Header name | `X-Client-Bot` |
| Header value | `true` |

6. Click **Deploy**

After deployment, all requests identified by Cloudflare as verified bots will carry the `X-Verified-Bot-Category` and `X-Client-Bot` headers when forwarded to your origin server.

## Step 2: Origin Server Adaptation

EMM already includes the bot bypass logic in `src/lib/server/turnstile.ts`. The `isTsVerified` function checks these headers and skips the Turnstile challenge for trusted bot categories:

```ts
// Trusted bot categories from Cloudflare Verified Bots
const trustedCategories = [
  'Search Engine Crawler',  // Googlebot, Bingbot, etc.
  'Page Preview',           // Slack, Discord link previews
  'Feed Fetcher',           // RSS/Atom feed readers
  'Archiver',               // Internet Archive, etc.
];
```

No additional code changes are required on your part.

## Step 3: Secure Your Origin Server

> **Warning:** Attackers can forge headers like `X-Client-Bot` if they access your origin IP directly, bypassing Turnstile entirely. Take at least one of these measures:

- **Use [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)** (recommended, most secure) — no open ports on your origin
- **Restrict origin firewall to [Cloudflare IP ranges](https://www.cloudflare.com/ips/)** — only accept traffic from Cloudflare's edge

## FAQ

**Q: Why not just check the User-Agent?**

User-Agent headers are trivial to spoof. Cloudflare's Verified Bot detection is based on IP reverse DNS verification, which is far more trustworthy.

**Q: What are the possible values of `cf.verified_bot_category`?**

| Category | Description |
|---|---|
| Search Engine Crawler | Googlebot, Bingbot, and other search engine crawlers |
| Page Preview | Link preview services like Slack, Discord |
| Feed Fetcher | RSS/Atom feed readers |
| Archiver | Archival services like Internet Archive |

**Q: What happens if I don't create this rule?**

All crawlers (including search engines) will be blocked by the Turnstile challenge. Your site may not be indexed by search engines.
