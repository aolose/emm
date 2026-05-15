import { NULL } from '../enum';
import { primary } from './decorations';

const { INT } = NULL;

export class TokenInfo {
	@primary
	id = INT;
	type = INT;
	_reqs?: Set<number>;
	createAt = INT;
	expire = INT;
	times = INT;
}
