import { NULL } from '../enum';
import { primary, unique } from './decorations';

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
