import { NULL } from '../enum';
import { primary, noNull, unique } from './decorations';
import type { Obj } from '$lib/types';
import type { Post } from './post';

const { INT, TEXT } = NULL;

export class Require {
	@primary
	id = INT;
	@noNull
	@unique
	name = TEXT;
	@noNull
	type = INT;
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
