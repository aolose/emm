import type { apiHooks, Obj } from '$lib/types';
import type { Post, Tag, Comment } from '$lib/server/model';
import { getErr, modelArr2Str } from '$lib/utils';
import { DiffMatchPatch } from 'diff-match-patch-typescript';
import { originPost } from '$lib/store';
import { get } from 'svelte/store';
import { req } from '$lib/req';
import { method } from '$lib/enum';

const dmp = new DiffMatchPatch();
let postId = 0;
let postVer = 0;

/**
 * add global hook for browser side requests
 */
export const hooks: apiHooks = {
	tag: {
		post: {
			before: (o) => modelArr2Str(o as Tag, '_posts')
		}
	},
	rule: {
		post: {
			before(a) {
				if (typeof a === 'object') {
					const d = { ...a } as {
						forbidden?: boolean;
						trigger?: boolean;
						status?: string;
						method?: string;
						country?: string;
						times?: number;
						ip?: string;
					};
					if (d.trigger) {
						if (d.country) d.country = '';
						if (d.method) d.method = '';
						if (d.ip) d.ip = '';
					} else {
						if (d.status) d.status = '';
						if (d.times) d.times = -1;
					}
					return d;
				}
			}
		}
	},
	post: {
		patch: {
			after(p, r) {
				const id = +(p as string).split(',', 1)[0];
				if (postId === id) {
					const [ver, save] = (r as string).split(',');
					postVer = +ver;
					if (save) {
						return { id, save: +save };
					}
				}
				return {};
			}
		},
		post: {
			proxy(p) {
				const o = p as Obj<Post>;
				const keys = Object.keys(o);
				const content = o.content_d;
				if (keys.length === 2 && o.id && 'content_d' in o && content) {
					if (o.id !== postId) {
						postId = o.id;
						postVer = 0;
					}
					const ori = get(originPost);
					const old = ori.content_d || ori.content;
					if (old && ori.id === postId) {
						const patch = [postId, postVer, content.length, content];
						if (postVer) {
							const diff = dmp.diff_main(old, content, true);
							if (diff.length > 2) {
								dmp.diff_cleanupSemantic(diff);
							}
							const patchList = dmp.patch_make(old, content, diff);
							let patchText = '';
							const inf = [];
							const dif = [];
							for (const { diffs, start1, start2, length1, length2 } of patchList) {
								inf.push(start1, start2, length1, length2);
								const str: string[] = [];
								diffs.forEach(([a, b]) => {
									inf.push(-a + 1 || '');
									str.push(b);
								});
								dif.push(str.join('\x00'));
							}
							patchText = inf.join() + '\x01' + dif.join('\x01');
							// no diff
							if (!patchText) return p;
							if (patchText.length >= content.length) patch[2] = patch[1] = postVer = 0;
							else patch[3] = patchText;
						}
						return req('post', patch.join(), { method: method.PATCH }).catch((e) => {
							if (getErr(e).startsWith('patch content length miss match')) {
								// full send to sync content
								postVer = 0;
								return req('post', [postId, postVer, content.length, content].join(), {
									method: method.PATCH
								});
							} else throw e;
						});
					}
				}
			},
			before: (v) => {
				const o = v as Post & { _?: number };
				if (o.id) delete o._;
				return modelArr2Str(o, '_reqs');
			}
		}
	},
	cm: {
		post: {
			before: (v) => {
				const o = v as Obj<Comment>;
				if (o.topic === o.reply) delete o.reply;
			}
		}
	},
	cmLs: {
		get: {
			before: (p) => {
				const o = p as { status?: number };
				if (o.status === -1) {
					delete o.status;
				}
				return o;
			}
		}
	}
};
