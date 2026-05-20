# EMM - Easy Markdown Manager

![Static Badge](https://img.shields.io/badge/sveltekit-^2.59.1-f96743?style=flat&logo=svelte&link=https://svelte.dev/docs/kit/introduction)
![Static Badge](https://img.shields.io/badge/typescript-^6.0.3-3178c6?style=flat&link=https://www.typescriptlang.org)
![Static Badge](https://img.shields.io/badge/bun-latest-f472b6?style=flat&logo=bun&link=https://bun.sh)
![Static Badge](https://img.shields.io/badge/sqlite-latest-003B57?style=flat&logo=sqlite&link=https://bun.sh/docs/api/sqlite)
![Static Badge](https://img.shields.io/badge/sass-^1.99-cc6699?style=flat&logo=sass&link=https://sass-lang.com)
![Static Badge](https://img.shields.io/badge/marked-^18.0.3-yellow?style=flat&logo=markdown&link=https://marked.js.org)
![Static Badge](https://img.shields.io/badge/codemirror-^6.0-blue?style=flat&logo=codemirror&link=https://codemirror.net)
![Static Badge](https://img.shields.io/badge/license-MIT-green?style=flat)

A self-hosted markdown blog system built with SvelteKit and Bun. Designed for personal writing and content management, with a focus on simplicity and performance.

## Contents
- [Screenshots](#screenshots)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Turnstile Anti-Crawl Setup](#turnstile-anti-crawl-setup)
- [Contributing](#contributing)
- [License](#license)

## Screenshots

### Desktop

<p>
  <img src="doc/home.webp" width="750" alt="file list" /><br/><br/>
  <img src="doc/list.webp" width="750" alt="file list" /><br/><br/>
  <img src="doc/view.webp" width="750" alt="file view" /><br/><br/>
  <img src="doc/login.webp" width="750" alt="login" /><br/><br/>
  <img src="doc/write.webp" width="750" alt="writing" /><br/><br/>
  <img src="doc/fw.webp" width="750" alt="file management" /><br/><br/>
  <img src="doc/manage.webp" width="750" alt="admin settings" />
</p>

### Mobile

<p>
  <img src="doc/list_m.webp" width="220" alt="file list on mobile" />
  <img src="doc/view_m.webp" width="220" alt="file view on mobile" />
  <img src="doc/manage_m.webp" width="220" alt="admin on mobile" />
  <img src="doc/write_m.webp" width="220" alt="writing on mobile" />
  <img src="doc/fw_m.webp" width="220" alt="file management on mobile" />
</p>





## Features

- **SSR + PWA** — Server-side rendering with offline support via service workers
- **Responsive Design** — Optimized for both desktop and mobile devices
- **Markdown Editor** — Full-featured editor built on CodeMirror 6 with custom toolbar and paste-to-upload
- **Syntax Highlighting** — Code blocks styled with highlight.js
- **Article Management** — Create, edit, and organize markdown posts with version diff history
- **Tags** — Categorize content with a tag system; Chinese titles auto-generate pinyin slugs
- **Comments** — Built-in comment management with moderation support
- **File Management** — Upload and manage static files and images
- **Image Viewer** — Click-to-zoom image preview powered by Viewer.js
- **Image Compression** — Automatic client-side image compression on upload
- **Visit Statistics** — Track page views (PUV) with an admin dashboard
- **Blog Mode** — Publish posts publicly or keep them private
- **RSS Feed** — Auto-generated RSS feed for public posts
- **Sitemap & robots.txt** — Auto-generated for search engine indexing
- **Turnstile Integration** — Cloudflare Turnstile CAPTCHA with verified bot bypass
- **Firewall** — IP-based access control, bot detection, custom rules with time scheduling
- **UA Collection Detection** — Detect distributed crawlers by grouping IPs sharing the same User-Agent
- **Geo IP Location** — Display visitor geographic information based on IP2Location Lite
- **Cloudflare Integration** — Auto-push blocked IPs to Cloudflare IP Lists for edge-level filtering
- **Backup & Restore** — Export and import data for disaster recovery
- **Self-Hosted** — Runs on your own server, all data stays with you

## Tech Stack

| Category | Technology |
|---|---|
| Framework | [SvelteKit](https://svelte.dev/docs/kit/introduction) (SSR) |
| Runtime | [Bun](https://bun.sh) |
| Database | SQLite via `bun:sqlite` |
| Styling | [SCSS](https://sass-lang.com) + [clsx](https://github.com/lukeed/clsx) |
| Fonts | [SUIT](https://sunn.us/SUIT/) · [Noto Sans SC](https://fonts.google.com/noto/specimen/Noto+Sans+SC) |
| Markdown Editor | [CodeMirror 6](https://codemirror.net) + [svelte-codemirror-editor](https://github.com/touchifyapp/svelte-codemirror-editor) |
| Markdown Renderer | [marked](https://marked.js.org) + [highlight.js](https://highlightjs.org) |
| Type Checking | TypeScript |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (latest)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/aolose/emm.git
cd emm

# Install dependencies
bun install

# Build for production
bun run build

# Start the server
bun run preview
```

The application will be available at `http://localhost:4173`.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4173` | Server listen port |
| `ORIGIN` | `http://localhost:4173` | Public origin URL (required for RSS / sitemap) |

Set them before starting the server:

```bash
PORT=3000 ORIGIN=https://blog.example.com bun run preview
```

### Authentication

On first run, visit the `/config` page to set up your admin username and password. No registration system — single admin account.

### Configuration

All settings are managed through the Admin UI (`/admin/setting`), stored in the SQLite database:

- **Blog Info**: blog name, bio, SEO keywords/description, social links
- **Upload/Thumbnail Directories**: configurable storage paths for uploaded files and generated thumbnails
- **Geo Location**: ip2location lite token and database directory for IP-based country blocking
- **Comments**: enable/disable comments, moderation toggle
- **Firewall Rules**: IP/header/path-based access rules, rate limiting, custom responses

Runtime files and directories:

- **SQLite database** — configured path (stores posts, tags, config, firewall rules, etc.)
- **Upload directory** — configured in admin settings (defaults to `data/upload`)
- **Thumbnail directory** — configured in admin settings (defaults to `data/thumb`)

### Production Deployment

```bash
bun install
bun run build
# The built output is in the `dist/` directory
bun run dist/index.js
```

For long-running production use, consider a process manager:

```ini
# systemd example (/etc/systemd/system/emm.service)
[Unit]
Description=EMM Blog
After=network.target

[Service]
Type=simple
User=emm
WorkingDirectory=/home/emm/app
Environment=PORT=3000
Environment=ORIGIN=https://blog.example.com
ExecStart=bun run dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Or with PM2:

```bash
pm2 start dist/index.js --name emm --interpreter bun
```

## Turnstile Anti-Crawl Setup

EMM integrates Cloudflare Turnstile CAPTCHA and includes a built-in search engine crawler whitelist bypass logic.

If you use Cloudflare proxy and have Turnstile enabled, you need to configure a Transform Rule to ensure SEO crawlers are not blocked.

For detailed steps, see: [doc/turnstile.md](doc/turnstile.md)

> **Security Reminder**: Make sure to protect your origin server to prevent attackers from bypassing Cloudflare and directly accessing the origin IP to forge request headers. It is recommended to use  [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) or restrict your origin firewall to only accept [Cloudflare IP ranges](https://www.cloudflare.com/ips/).

## Contributing

Issues and pull requests are welcome. Before submitting a PR:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push and open a pull request

## License

MIT © [Aolose](https://github.com/aolose)
