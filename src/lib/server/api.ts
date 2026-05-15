// Barrel — merges all domain API modules.
// Split from a single 916-line file into focused modules:
//   auth.ts, post.ts, tag.ts, firewall.ts, system.ts, comment.ts, file.ts, backup.ts

import type { APIRoutes } from '../types';
import authApis from './api/auth';
import postApis from './api/post';
import tagApis from './api/tag';
import firewallApis from './api/firewall';
import systemApis from './api/system';
import commentApis from './api/comment';
import fileApis from './api/file';
import backupApis from './api/backup';

const apis: APIRoutes = {
	...authApis,
	...postApis,
	...tagApis,
	...firewallApis,
	...systemApis,
	...commentApis,
	...fileApis,
	...backupApis,
};

export const apiPath = Object.keys(apis);
export default apis;
