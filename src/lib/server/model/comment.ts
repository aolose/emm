import { NULL } from '../enum';
import { primary, noNull } from './decorations';
import type { Obj } from '$lib/types';

const { INT, TEXT } = NULL;

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
