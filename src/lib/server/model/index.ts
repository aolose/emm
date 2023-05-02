import { NULL } from '../enum';
import { noNull, primary, unique } from './decorations';
import { model, setNull, uniqSlug, slugGen } from '$lib/server/utils';
import { diffObj, filter, str2Hds } from '$lib/utils';
import type { DB } from '$lib/server/db/sqlite3';
import { publishedPost } from '$lib/server/store';
import type { Obj } from '$lib/types';
import { reqPostCache, tagPostCache } from '$lib/server/cache';
import { sitemap } from '$lib/sitemap';

const { INT, TEXT } = NULL;

export class Res {
	@primary
	id = INT;
	type = TEXT;
	size = INT;
	name = TEXT;
	@unique
	md5 = TEXT;
	save = INT;
	thumb = INT;
	userId = INT;
}

export class ShortPost {
	@primary
	id = INT;
	comment = true;
	content = TEXT;
	token = TEXT;
	publish = INT;
	modify = INT;
	createAt = INT;
	userId = INT;
}

export class Tag {
	@primary
	id = INT;
	@unique
	name = TEXT;
	desc = TEXT;
	createAt = INT;
	userId = INT;
	banner = INT;
	_posts?: string | { id: number; title: string }[];
}

export class PostTag {
	@primary
	id = INT;
	postId = INT;
	tagId = INT;
}

export class Post {
	@primary
	id = INT;
	banner = INT;
	slug = TEXT;
	desc = TEXT;
	_tag = TEXT;
	published = 0;
	disCm = INT;
	_cm = INT; // allow comment
	_u?: { slug: string; title: string }; // prev post
	_n?: { slug: string; title: string }; // next post
	title = TEXT;
	content = TEXT;
	title_d = TEXT;
	content_d = TEXT;
	createAt = INT;
	publish = INT;
	modify = INT;
	save = INT;
	userId = INT;
	_p = 0; // publish mode
	_reqs?: string | { id: number; name: string }[]; // permissions
	// reqId
	_r?: number; // read
	onSave(db: DB, now: number) {
		const { id, title_d, title, content_d } = this;
		const oo = id ? db.get(model(this.constructor as FunctionConstructor, { id })) : {};
		const ori = oo as Post;
		const df = diffObj(
			filter({ ...ori } as Post, ['content_d', 'content', 'title', 'title_d'], false),
			filter({ ...this }, ['content_d', 'content', 'title', 'title_d'], false)
		) as Post;
		if (typeof this._reqs === 'string') {
			const ids = this._reqs
				.split(',')
				.filter((a) => /\d+/g.test(a))
				.map((a) => +a);
			reqPostCache.setReqs(id, ids);
		}
		if (this._p) {
			if (ori?.publish) {
				this.modify = now;
			} else this.publish = now;
			if (!ori.published) this.published = 1;
			const c = content_d || ori.content_d;
			const t = title_d || ori.title_d;
			if (t && ori.title !== t) {
				this.title = t;
				if (ori.title_d) setNull(this, 'title_d');
			}
			if (c && this.content !== c) {
				this.content = c;
				if (ori.content_d) setNull(this, 'content_d');
			}
			const ti = t || title || ori.title;
			const sl = this.slug || ori.slug;
			if (!sl && ti) {
				this.slug = slugGen(ti);
			}
			if (this.slug) {
				const s = uniqSlug(this.id, this.slug);
				if (s && ori.slug !== this.slug) this.slug = s;
			}
			publishedPost.update((a) => new Set([...a, id]));
		} else if (this.published === 0)
			publishedPost.update((a) => {
				a.delete(id);
				return new Set([...a]);
			});
		if ('_tag' in this && id) {
			const tags = this._tag.split(',').filter((a) => a);
			tagPostCache.setTags(id, tags);
		}
		if (this._p || this.published === 0 || (this.published && '_tag' in this)) {
			sitemap.refresh();
		}
		return !df;
	}
}

export class Require {
	@primary
	id = INT;
	@noNull
	@unique
	name = TEXT;
	@noNull
	type = INT; // enum.type
	remark = TEXT;
	createAt = INT;
	_posts?: Obj<Post>[];
	_postIds?: string;
}

export class RequireMap {
	@primary
	id = INT;
	reqId = INT;
	targetId = INT;
	type = INT;
}

export class Comment {
	@primary
	id = INT;
	ip = TEXT;
	_geo?: string;
	_name = TEXT;
	_avatar = INT;
	@noNull
	content = TEXT;
	reply = INT;
	subCm = TEXT;
	_cms?:
		| {
				total: number;
				items: Obj<Comment>[];
		  }
		| undefined;
	_reply?: string;
	topic = INT;
	state = INT;
	createAt = INT;
	save = INT;
	postId = INT;
	userId = INT;
	isAdm = INT;
	_own?: 1 | 2;
	_slug?: string;
	_post?: { title: string; slug: string };
}

export class CmUser {
	@primary
	id = INT;
	avatar = INT;
	del = INT;
	name = TEXT;
	token = TEXT;
	exp = INT;
}

export class System {
	@primary
	id = INT;
	admUsr = TEXT;
	admPwd = TEXT;
	uploadDir = TEXT;
	thumbDir = TEXT;
	blogName = TEXT;
	blogBio = TEXT;
	seoKey = TEXT;
	seoDesc = TEXT;
	ipLiteToken = TEXT;
	ipLiteDir = TEXT;
	description = TEXT;
	keywords = TEXT;
	comment = INT; // use comment
	noSpam = false; // check spam comment
	cmCheck = INT; // check comment
	analysis = false; // use analysis
	pageScript = TEXT;
	pageCss = TEXT;
	robots = TEXT;
	maxFireLogs = INT;
}

export class User {
	@primary
	id = INT;
	@noNull
	name = TEXT;
	avatar = INT;
	@noNull
	pwd = TEXT;
	birth = INT;
	desc = TEXT;
	createAt = INT;
	role = INT;
}

export class FWRule {
	@primary
	id = INT;
	mark = TEXT;
	ip = TEXT;
	path = TEXT;
	method = TEXT;
	headers = TEXT;
	createAt = INT;
	save = INT;
	log = false;
	country = TEXT;
	active = true;
	rate = TEXT;
	trigger = false;
	status = TEXT;
	respId = INT;
	rateLimiter(): [number, (times: number, dur: number) => number] {
		const rates: [number, number][] = [];
		const s = new Set();
		if (this.rate)
			this.rate
				.replace(/[^0-9,/]/g, '')
				.split(',')
				.filter((a) => a)
				.map((a) => {
					const [c, d = 3600] = a.split('/');
					let e = +c;
					const f = +d * 1e3;
					if (e < 0) e = 1;
					if (e && f) {
						const k = `${e}:${f}`;
						if (!s.has(k)) {
							s.add(k);
							rates.push([e, f]);
						}
					}
				});
		rates.sort((a, b) => b[1] / b[0] - a[1] / a[0]);
		if (!rates.length) rates.push([1, 3600 * 1e3]);
		// 1  - hit
		// -1 - over range
		// 0  - go on
		return [
			Math.max(...rates.map((a) => a[1])),
			(times: number, dur: number) => {
				for (const [t, d] of rates) {
					if (dur < d && times >= t) {
						return 1;
					}
				}
				return 0;
			}
		];
	}
}

export class FwResp {
	@primary
	id = INT;
	status = INT;
	@unique
	name = TEXT;
	headers = TEXT;
	body = TEXT;
	createAt = INT;
	toResp() {
		const body = this.body === '-' || !this.body ? null : this.body;
		const hds = this.headers === '-' || !this.headers ? '' : this.headers;
		return new Response(body, {
			status: this.status || 403,
			headers: new Headers(str2Hds(hds))
		});
	}
}

export class BlackList {
	@primary
	id = INT;
	ip = TEXT;
	_geo?: string;
	createAt = INT;
	mark = TEXT;
	respId = INT;

	toRule() {
		return model(FWRule, {
			active: true,
			id: -this.id,
			ip: this.ip,
			mark: this.mark || 'blacklist',
			createAt: this.createAt,
			respId: this.respId
		}) as FWRule;
	}
}

export class FwLog {
	@primary
	id = INT;
	ip = TEXT;
	path = TEXT;
	method = TEXT;
	headers = TEXT;
	save = INT;
	mark = TEXT;
	_city = '';
	status = INT;
}

export class TokenInfo {
	@primary
	id = INT;
	expire = INT;
	code? = TEXT;
	times? = INT;
	used? = INT;
	type = INT;
	value? = TEXT;
	share? = INT;

	set _reqs(reqs: Set<number> | undefined) {
		if (reqs === undefined) this.value = TEXT;
		else this.value = [...reqs].join();
	}

	get _reqs(): Set<number> | undefined {
		return this.value
			? new Set(
					this.value
						.split(',')
						.map((a) => +a)
						.filter((a) => a)
			  )
			: undefined;
	}

	createAt = INT;
}

export class TkTick {
	@noNull
	ticket = TEXT;
	@noNull
	token = TEXT;
}

export class RPU {
	@primary
	id = INT;
	r = INT;
	ur = INT;
	p = INT;
	u = INT;
	t = INT;
	type = INT;
}

export class RPUCache {
	@primary
	id = INT;
	value = TEXT;
}

export class PostRead {
	@primary
	id = INT;
	pid = INT;
	ip = TEXT;
	ua = TEXT;
	_geo?:string;
	createAt = INT;
}
