import { NULL } from '../../enum';
import { noNull, primary, unique } from './decorations';

const { INT, TEXT, DATE } = NULL;

export class Count {
	@primary
	@noNull
	key = INT;
	count = INT;
}

export class Balabala {
	@primary
	id = INT;
	comment = true;
	content = TEXT;
	tokenIds = TEXT;
	publish = DATE;
	update = DATE;
}

export class Article {
	@primary
	id = INT;
	@unique
	@noNull
	slug = TEXT;
	desc = TEXT;
	tag = TEXT;
	comment = true;
	title = TEXT;
	content = TEXT;
	tokenIds = TEXT;
	publish = DATE;
	update = DATE;
}

export class Token {
	@primary
	id = INT;
	@noNull
	@unique
	key = TEXT;
	@noNull
	type = INT; // enum.type
	features = TEXT; // enum.features
	@noNull
	expire = INT;
	targetIds = TEXT;
	remark = TEXT;
}

export class Comment {
	@primary
	id = INT;
	@noNull
	name = TEXT;
	@noNull
	say = TEXT;
	time = DATE;
	replyId = INT;
	state = INT; // -1 skip 0 - wait review  1 - review ok 2 - review no pass
	tokenId = INT;
}

export class System {
	@primary
	id = INT;
	admUsr = TEXT;
	admPwd = TEXT;
	blogName = TEXT;
	blogUrl = TEXT;
	blogBio = TEXT;
	description = TEXT;
	keywords = TEXT;
	apiCors = TEXT;
	comment = false; // use comment
	noSpam = false; // check spam comment
	commentReview = false; // check comment
	firewall = false; // use firewall
	analysis = false; // use analysis
	rss = false; // use rss
	pageScript = TEXT;
	pageCss = TEXT;
}

export class User {
	@primary
	id = INT;
	@noNull
	name = TEXT;
	avatar = TEXT;
	@noNull
	pwd = TEXT;
	birth = DATE;
	desc = TEXT;
}
