import { NULL } from '../enum';
import { primary } from './decorations';
import { model, setNull, uniqSlug, slugGen } from '$lib/server/utils';
import { diffObj, filter } from '$lib/utils';
import type { DB } from '$lib/server/db/sqlite3';
import { publishedPost } from '$lib/server/store';
import { reqPostCache, tagPostCache } from '$lib/server/cache';
import { sitemap } from '$lib/sitemap';
import { feedData } from '$lib/feedData';

const { INT, TEXT } = NULL;

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
	bannerR2Synced?: boolean;
	bannerR2Key?: string;
	slug = TEXT;
	desc = TEXT;
	_d = TEXT;
	_tag = TEXT;
	published = 0;
	disCm = INT;
	_cm = INT;
	_u?: { slug: string; title: string };
	_n?: { slug: string; title: string };
	title = TEXT;
	content = TEXT;
	title_d = TEXT;
	content_d = TEXT;
	createAt = INT;
	publish = INT;
	modify = INT;
	save = INT;
	userId = INT;
	_p = 0;
	_reqs?: string | { id: number; name: string }[];
	_r?: number;
	draftUuid = TEXT;

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
			const tags = (this._tag || '')
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean);
			tagPostCache.setTags(id, tags);
		}
		if (this._p || this.published === 0 || (this.published && '_tag' in this)) {
			sitemap.refresh();
			feedData.invalidate();
		}
		return !df;
	}
}
