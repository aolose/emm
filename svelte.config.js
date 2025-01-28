import adapter from 'svelte-adapter-bun';
import { sveltePreprocess } from 'svelte-preprocess';

const nm = {};
let i = 0;

function hashId(hash) {
  const cls = nm[hash];
  if (cls) {
    return cls;
  } else {
    return (nm[hash] = (i++).toString(36));
  }
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: sveltePreprocess(),
  compilerOptions: {},
  kit: {
    serviceWorker: {
      register: false
    },
    adapter: adapter({ out: 'dist' })
  }
};

if (process.env.NODE_ENV !== 'development') {
  config.compilerOptions.cssHash = ({ hash, css }) => `_${hashId(hash(css))}`;
}
export default config;
