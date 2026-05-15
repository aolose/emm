import { NULL } from '../enum';
import { primary } from './decorations';

const { INT, TEXT } = NULL;

export class RPU {
	@primary
	id = INT;
	date = INT;
	type = INT;
	pv = INT;
	uv = INT;
}

export class RPUCache {
	@primary
	id = INT;
	pid = INT;
	type = INT;
	createAt = INT;
}

export class PostRead {
	@primary
	id = INT;
	pid = INT;
	ip = TEXT;
	ua = TEXT;
	createAt = INT;
	_geo?: string;
}
