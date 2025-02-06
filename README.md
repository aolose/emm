# A personal blog system
![Static Badge](https://img.shields.io/badge/sveltekit-^2.17.1-f96743?style=flat&logo=svelte&link=https%3A%2F%2Fsvelte.dev%2Fdocs%2Fkit%2Fintroduction)
![Static Badge](https://img.shields.io/badge/typescript-^5.7.3-3178c6?style=flat&link=https%3A%2F%2Fwww.typescriptlang.org)
![Static Badge](https://img.shields.io/badge/bun-latest-f472b6?style=flat&logo=bun&link=https%3A%2F%2Fbun.sh)
![Static Badge](https://img.shields.io/badge/bun-sqlite-f472b6?style=flat&logo=bun&link=https%3A%2F%2Fbun.sh%2Fdocs%2Fapi%2Fsqlite)
![Static Badge](https://img.shields.io/badge/sass-^1.84.0-bf4080?style=flat&logo=sass&link=https%3A%2F%2Fsass-lang.com)
![Static Badge](https://img.shields.io/badge/isbot-^5.1.22-007ec6?style=flat&logo=isbot&link=https%3A%2F%2Fisbot.js.org)
![Static Badge](https://img.shields.io/badge/marked-^15.0.6-yellow?style=flat&logo=marked&link=https%3A%2F%2Fmarked.js.org)
![Static Badge](https://img.shields.io/badge/easymde-^2.18.0-green?style=flat&link=https%3A%2F%2Fgithub.com%2FIonaru%2Feasy-markdown-editor)

![home](doc/home.webp)

Here is my personal blog. I am currently using it to
record my daily life and a small amount of technical
experience. It is suitable for deployment on a vps with
a bun environment. I didn't do any functional support
in the direction of SEO or business, emm... it is only
suitable for writing, and the theme cannot be modified.
If you are interested in it, welcome to fork it.


The code of the current project is still very messy
and far from the standard of an open source project.

### Features

- SSR+PWA
- Responsive web design for mobile and pc
- Comments management
- Firewall
- Article management
- Tags management
- Files management
- Permissions management
- Visit Statistics
- backup to local and upload recovery
- Image upload compression


### Deploy
1. Build
```bash
bun i
bun run build
```
2. Upload the dist folder to your vps.
3. Run
```bash
cd dist
bun i
bun --bun run start
```


### Screenshots

#### PC
![screenshot](doc/list.webp)
![screenshot](doc/view.webp)
![screenshot](doc/login.webp)
![screenshot](doc/write.webp)
![screenshot](doc/fw.webp)
![screenshot](doc/manage.webp)


### Mobile
<img width=400 src="doc/list_m.webp"/>
<img width=400 src="doc/view_m.webp"/>
<img width=400 src="doc/manage_m.webp"/>
<img width=400 src="doc/write_m.webp"/>
<img width=400 src="doc/fw_m.webp"/>

