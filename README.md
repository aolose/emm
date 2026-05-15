# EMM - Easy Markdown Manager

![Static Badge](https://img.shields.io/badge/sveltekit-^2.59.1-f96743?style=flat&logo=svelte&link=https%3A%2F%2Fsvelte.dev%2Fdocs%2Fkit%2Fintroduction)
![Static Badge](https://img.shields.io/badge/typescript-^6.0.3-3178c6?style=flat&link=https%3A%2F%2Fwww.typescriptlang.org)
![Static Badge](https://img.shields.io/badge/bun-latest-f472b6?style=flat&logo=bun&link=https%3A%2F%2Fbun.sh)
![Static Badge](https://img.shields.io/badge/sqlite-f472b6?style=flat&logo=bun&link=https%3A%2F%2Fbun.sh%2Fdocs%2Fapi%2Fsqlite)
![Static Badge](https://img.shields.io/badge/sass-^1.99-cc6699?style=flat&logo=sass&link=https%3A%2F%2Fsass-lang.com)
![Static Badge](https://img.shields.io/badge/marked-^18.0-yellow?style=flat&logo=markdown&link=https%3A%2F%2Fmarked.js.org)
![Static Badge](https://img.shields.io/badge/easymde-^2.21-green?style=flat&link=https%3A%2F%2Fgithub.com%2FIonaru%2Feasy-markdown-editor)

A self-hosted markdown blog system built with SvelteKit and Bun. Designed for personal writing and content management, with a focus on simplicity and performance.

![home](doc/home.webp)

## Features

- **SSR + PWA** — Server-side rendering with offline support via service workers
- **Responsive Design** — Optimized for both desktop and mobile devices
- **Markdown Editor** — Full-featured editor with live preview (EasyMDE)
- **Syntax Highlighting** — Code blocks styled with highlight.js
- **Comments** — Built-in comment management system
- **Firewall** — IP-based access control and bot detection
- **Article Management** — Create, edit, and organize markdown posts
- **Tags** — Categorize content with a tag system
- **File Management** — Upload and manage static files and images
- **Visit Statistics** — Track page views (PUV) with an admin dashboard
- **Backup & Restore** — Export and import data for disaster recovery
- **Image Compression** — Automatic client-side image compression on upload
- **Blog Mode** — Publish posts publicly or keep them private
- **Self-Hosted** — Runs on your own server, all data stays with you

## Tech Stack

| Category | Technology |
|---|---|
| Framework | [SvelteKit](https://svelte.dev/docs/kit/introduction) (SSR) |
| Runtime | [Bun](https://bun.sh) |
| Database | SQLite via `bun:sqlite` |
| Styling | [SCSS](https://sass-lang.com) + [clsx](https://github.com/lukeed/clsx) |
| Fonts | [SUIT](https://sunn.us/SUIT/) · [Noto Sans SC](https://fonts.google.com/noto/specimen/Noto+Sans+SC) |
| Markdown Editor | [EasyMDE](https://github.com/Ionaru/easy-markdown-editor) |
| Markdown Renderer | [marked](https://marked.js.org) + [highlight.js](https://highlightjs.org) |
| Type Checking | TypeScript |

## Screenshots

### Desktop

![file list](doc/list.webp)
![file view](doc/view.webp)
![login](doc/login.webp)
![writing](doc/write.webp)
![file management](doc/fw.webp)
![admin settings](doc/manage.webp)

### Mobile

<img width="400" alt="file list on mobile" src="doc/list_m.webp"/>
<img width="400" alt="file view on mobile" src="doc/view_m.webp"/>
<img width="400" alt="admin on mobile" src="doc/manage_m.webp"/>
<img width="400" alt="writing on mobile" src="doc/write_m.webp"/>
<img width="400" alt="file management on mobile" src="doc/fw_m.webp"/>

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

### Production Deployment

```bash
bun install
bun run build
# The built output is in the `dist/` directory
# Deploy and run with: bun run dist/index.js
```

### Authentication

On first run, visit the `/config` page to set up your admin username and password. No registration system — single admin account.

### Configuration

All settings are managed through the Admin UI (`/admin/setting`), stored in the SQLite database:

- **Blog Info**: blog name, bio, SEO keywords/description, social links
- **Upload/Thumbnail Directories**: configurable storage paths for uploaded files and generated thumbnails
- **Geo Location**: ip2location lite token and database directory for IP-based country blocking (see [Geolocation access control](#geolocation-access-control))
- **Comments**: enable/disable comments, moderation toggle
- **Firewall Rules**: IP/header/path-based access rules, rate limiting, custom responses

### Geolocation access control

Uses [ip2location lite](https://lite.ip2location.com) to restrict access by country. Configure via admin settings:

1. Obtain an ip2location lite token
2. Set the token and database directory in **Admin Settings → Geo**
3. Create firewall rules with country-based conditions

## Data

On first run you will be asked to choose a database location. All data is stored in a single SQLite database.

Runtime files and directories:

- **SQLite database** — configured path (stores posts, tags, config, firewall rules, etc.)
- **Upload directory** — configured in admin settings (defaults to `data/upload`)
- **Thumbnail directory** — configured in admin settings (defaults to `data/thumb`)

## License

MIT © [Aolose](https://github.com/aolose)