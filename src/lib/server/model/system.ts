import { NULL } from '../enum';
import { primary, noNull } from './decorations';

const { INT, TEXT } = NULL;

export class System {
	@primary
	id = INT;
	admUsr = TEXT;
	about = TEXT;
	admPwd = TEXT;
	uploadDir = TEXT;
	thumbDir = TEXT;
	blogName = TEXT;
	blogBio = TEXT;
	seoKey = TEXT;
	linkedin = TEXT;
	github = TEXT;
	seoDesc = TEXT;
	ipLiteToken = TEXT;
	ipLiteDir = TEXT;
	description = TEXT;
	keywords = TEXT;
	comment = INT;
	noSpam = false;
	cmCheck = INT;
	analysis = false;
	pageScript = TEXT;
	pageCss = TEXT;
	robots = TEXT;
	maxFireLogs = INT;
	pwdSalt = TEXT;
	// Turnstile anti-crawl
	tsEnabled = false;
	tsSiteKey = TEXT;
	tsSecret = TEXT;
	tsVerifyTTL = INT; // seconds, default 1800
	// Cloudflare Lists integration
	cfAccountId = TEXT;
	cfApiToken = TEXT;
	cfListId = TEXT;
	// Firewall IP aggregation
	fwAggregate = true;
	fwLastCount = INT;
	fwLastAggregateAt = INT;
	// AI integration
	aiApiKey = TEXT;
	aiModel = TEXT;
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
