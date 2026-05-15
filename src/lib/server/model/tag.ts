import { NULL } from '../enum';
import { primary, unique } from './decorations';

const { INT, TEXT } = NULL;

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
