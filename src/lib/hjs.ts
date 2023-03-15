import hjs from 'highlight.js/lib/core';
const ls = new Set<string>();
export async function regHjs (lan:Set<string>){
  for (const a of lan) {
	let reg;
	if (!ls.has(a)) {
		ls.add(a)
		switch (a) {
			case 'js':
			case 'javascript':
				reg = await import('highlight.js/lib/languages/javascript');
				break;
			case 'css':
				reg = await import('highlight.js/lib/languages/css');
				break;
			case 'scss':
				reg = await import('highlight.js/lib/languages/scss');
				break;
			case 'yml':
			case 'yaml':
				reg = await import('highlight.js/lib/languages/yaml');
				break;
			case 'json':
				reg = await import('highlight.js/lib/languages/json');
				break;
			case 'xml':
			case 'html':
				reg = await import('highlight.js/lib/languages/xml');
				break;
			case 'go':
				reg = await import('highlight.js/lib/languages/go');
				break;
			case 'java':
				reg = await import('highlight.js/lib/languages/java');
				break;
			case 'nginx':
				reg = await import('highlight.js/lib/languages/nginx');
				break;
		}
		if (reg) {
			hjs.registerLanguage(a, reg.default);
		}
	}
}}

const unEscape = (str: string) => {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
};
export const highlight =  (n: string) => {
  const lan = new Set<string>();
  const str = n.replace(/<pre><code( class="language-(\w+)")?>/g, (_, a, b) => {
    let o = 'text';
    let s = 'common';
    if (b) {
      o = b;
      s = b.replace(/js/g, 'javascript').replace('html', 'xml');
      lan.add(s);
    }
    return `<pre><code class="language-${s}" name="${o}">`;
  });

  return str.replace(
    /(<pre><code class="language-\w+" name="\w+">)((.|\n)+?)<\/code><\/pre>/g,
    (_, a, b) => {
      let i = 1;
      let l = b.length-1;
      const num = [i];
      while (l--) {
        if (b[l] === '\n') num.push(i++);
      }
      const len = (i + '').length;
      const line = `<div class="line" style="width:${len + 1}em">${num
        .map((a) => `<div>${a}</div>`)
        .join('')}</div>`;
      return `${a}${line}<div class="code">${
        hjs.highlightAuto(unEscape(b)).value
      }</div></code></pre>`;
    }
  );
};