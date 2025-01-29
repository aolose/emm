import fs from 'fs';
import path from 'path';

function walkSync(currentDirPath, callback) {
	fs.readdirSync(currentDirPath, { withFileTypes: true }).forEach(function (dirent) {
		const filePath = path.join(currentDirPath, dirent.name);
		if (dirent.isFile()) {
			callback(filePath, dirent);
		} else if (dirent.isDirectory()) {
			walkSync(filePath, callback);
		}
	});
}

walkSync('src', function (filename) {
	if (filename.endsWith('.svelte')) {
		const svFile = fs.readFileSync(filename, 'utf8').toString();
		if (!/let \{(.+?)} = \$props\(\);/.test(svFile)) return;
		console.log(filename);
		const p = [];
		const a = svFile.replace(/let \{(.+?)} = \$props\(\);/g, (_, a) => {
			p.push(a);
			if (1 === p.length) return 'xxxxxx';
			return '';
		});
		fs.writeFileSync(filename, a.replace('xxxxxx', `let {${p.join()}} = $props();`));
	}
});
