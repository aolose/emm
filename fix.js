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
		const fixFile = filename.replace('.svelte', '.fix.scss');
		const svFile = fs.readFileSync(filename, 'utf8').toString();
		const hasScss = svFile.match(/<style lang="scss">([^`]+?)<\/style>/);
		if (hasScss) {
			const scss = hasScss[1];
			if (fs.existsSync(fixFile)) {
				const fix = fs.readFileSync(fixFile, 'utf8').toString();
				fs.writeFileSync(filename, svFile.replace(scss, fix));
				fs.unlinkSync(fixFile);
			} else {
				fs.writeFileSync(
					fixFile,
					scss.replace(
						/([ \t]+)((.*?,(\r?\n))*?.*?\{(\r?\n)((\1.*?)(\r?\n)+)+?\1}(\r?\n)+)((\1[a-z].*?:.*?;(\r?\n))+)/g,
						'$10$1$2'
					)
				);
			}
		}
	}
});
