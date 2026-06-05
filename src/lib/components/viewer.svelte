<script>
	import { marked } from 'marked';
	import { onMount, tick } from 'svelte';
	import { editPost } from '$lib/store';
	import { fade } from 'svelte/transition';
	import { highlight } from '../hjs';
	import { regElement } from '$lib/components/customent/reg';
	import File from '$lib/components/post/File.svelte';
	import { configureMarked } from '$lib/marked-config';

	configureMarked();
	regElement('x-file', File);

	function initMermaid(root) {
		if (!root) return;
		const blocks = root.querySelectorAll('pre.mermaid');
		if (!blocks.length) return;
		import('mermaid').then((m) => {
			m.default.initialize({ startOnLoad: false, theme: 'dark', suppressErrorRendering: true });
			Array.from(blocks).forEach((b) => {
				m.default.run({ nodes: [b] }).catch((err) => {
					console.error('[viewer] mermaid block error:', (b.textContent || '').slice(0, 50), err);
				});
			});
		}).catch((err) => {
			console.error('[viewer] mermaid import error:', err);
		});
	}

	let el = $state();
	let mor = $state();
	let patchMod = $state(false);
	let { ctx = {}, close, preview = false } = $props();
	let title = $state('');
	let content = $state('');

	const fx = (s) => {
		if (!s) return s;
		return s
			.replace(/<(\w+-\w+)([^>]*?)\/>/g, '<$1$2></$1>')
			.replace(
				/<(h\d) id="(.+?)">(.+?)<\/\1>/g,
				'<a class=\'head\' href="#$2" id="$2"><$1>$3</$1></a>'
			)
			.replace(/<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g, '<pre class="mermaid">$1</pre>');
	};

	$effect(() => {
		if (!preview) {
			title = ctx.title || '';
			content = ctx.content || '';
		}
	});

	const rawHtml = $derived(fx(`${marked.parse(content || '')}`));
	const highlightedHtml = $derived(highlight(rawHtml));

	$effect(() => {
		const html = highlightedHtml;
		if (preview && el) {
			if (patchMod && mor) {
				try {
					mor(el, `<div class="${el.className}">${html}</div>`);
					initMermaid(el);
				} catch (e) {
					console.error('[viewer] morphdom error:', e);
					el.innerHTML = html;
					initMermaid(el);
				}
			} else {
				el.innerHTML = html;
				initMermaid(el);
			}
		}
		// Public page: re-init mermaid on content change (client-side navigation)
		if (!preview && el) {
			tick().then(() => initMermaid(el));
		}
	});

	onMount(() => {
		if (preview) {
			import('morphdom').then((d) => {
				mor = d.default;
				patchMod = true;
			});
			const unsubscribe = editPost.subscribe(async (p) => {
				if (!p) return;
				title = p.title_d || '';
				content = p.content_d || '';
				await tick();
				if (el) initMermaid(el);
			});
			return unsubscribe;
		} else {
			tick().then(() => { if (el) initMermaid(el); });
		}
	});
</script>

{#if title || content}
	<div class="a" class:p={preview} transition:fade|global>
		{#if preview}
		<div class="t">
			<h1>{title || ''}</h1>
				{#if close}
				<button class="icon i-close" onclick={close}></button>
			{/if}
		</div>
		{/if}
		<div class="c" bind:this={el}>
			{#if !preview}
				{@html highlightedHtml}
			{/if}
		</div>
	</div>
{/if}

<style lang="scss">
  @use '../../lib/break' as *;
  @import 'highlight.js/styles/github-dark.css';
  @import 'viewerjs/dist/viewer.css';

  // 基础容器：控制无预览和预览形态下的黄金阅读宽度
  .a {
    overflow: auto;
    padding: 40px 24px;
    display: flex;
    height: 100%;
    flex-direction: column;
    max-width: 820px; // 网页经典黄金阅读宽度限制
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;

    @include s() {
      padding: 20px 16px;
    }

    :global {
      // 全局文本排版恢复
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;

      del {
        color: rgba(100, 120, 150, 0.6);
        text-decoration: line-through;
      }

      .head {
        text-decoration: none;
        color: inherit;
        &:hover h1, &:hover h2, &:hover h3, &:hover h4, &:hover h5, &:hover h6 {
          opacity: 0.85;
        }
      }

      p, span {
        overflow-wrap: break-word;
      }

      // 引用块优化：增加左侧暗示条
      blockquote {
        border-radius: 6px;
        background: rgba(37, 43, 57, 0.35);
        border-left: 4px solid #5686f5;
        margin: 24px 0;
        font-size: 15px;
        padding: 16px 20px;
      }

      blockquote p {
        color: #a3b8cc;
        display: block; // 改为块级，符合标准 markdown 习惯
        margin-bottom: 0;
      }

      // 行内代码优化
      code {
        border-radius: 4px;
        padding: 3px 6px;
        color: #72af6f;
        background: rgba(10, 20, 40, 0.6);
        font-family: monospace;
        font-size: 0.9em;
      }

      // 代码块级排版优化
      pre {
        margin: 24px 0;
        position: relative;

        & > code {
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          max-width: 100%;
          overflow: hidden;
          letter-spacing: 0.5px;
          font-size: 14px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          white-space: pre-wrap;
          background: #0d1117; // 经典的 GitHub 暗色底
          padding: 44px 0 12px; // 为顶部 attr(name) 留出足够空间
          display: flex;
          position: relative;

          .code {
            color: #c9d1d9;
            white-space: pre;
            padding: 0 16px;
            overflow: auto;
            flex: 1;
            @include s() {
              scrollbar-width: none;
            }

            span {
              opacity: 0.9;
            }
          }

          // 代码行号
          .line {
            flex-shrink: 0;
            background: rgba(0, 0, 0, 0.15);
            border-right: 1px solid rgba(255,255,255,0.05);
            display: flex;
            flex-direction: column;
            user-select: none;
            padding: 0 10px;
            min-width: 25px;
            text-align: right;

            div {
              color: rgba(110, 118, 129, 0.6);
              font-size: 13px;
              line-height: inherit;
            }
          }

          // 顶部代码语言标签修正
          &:after {
            color: rgba(255, 255, 255, 0.4);
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(255,255,255,0.05);
            padding: 0 16px;
            font-size: 12px;
            font-family: sans-serif;
            content: attr(name);
            height: 34px;
            line-height: 34px;
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            pointer-events: none;
            text-transform: uppercase;
          }
        }
      }

      // 列表规范化
      ul, ol {
        margin: 0 0 24px;
        padding-left: 1.5em;
      }

      li {
        margin-top: 8px;
      }

      // 段落基本排版：取消首行缩进，采用段后距
      p, li {
        word-break: break-word;
        overflow-wrap: break-word;
        line-height: 1.8; // 提升易读性
        margin-bottom: 20px;
        font-size: 16px; // 16px-17px 是最佳阅读字号
        color: rgba(220, 230, 242, 0.9);
        font-weight: 400;
      }

      // 渐变链接样式
      a {
        color: #58a6ff !important;
        text-decoration: none;
        border-bottom: 1px dashed rgba(88, 166, 255, 0.4);
        transition: all 0.2s ease;
        &:hover {
          color: #79c0ff !important;
          border-bottom-style: solid;
        }
      }

      // 标题级联比例与间距修正
      h1, h2, h3, h4, h5, h6 {
        color: #f0f6fc;
        font-weight: 600;
        line-height: 1.35;
        margin-top: 32px;
        margin-bottom: 16px;
        text-align: left;
      }

      h1 { font-size: 30px; margin-top: 10px; }
      h2 { font-size: 24px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px; }
      h3 { font-size: 20px; }
      h4 { font-size: 18px; }
      h5 { font-size: 16px; }
      h6 { font-size: 14px; color: #8b949e; }

      // 复杂元素：表格高级适配
      table {
        margin: 24px 0;
        border-collapse: collapse;
        width: 100%;
        max-width: 100%;
        overflow-x: auto;
        display: block; // 防止超宽表格撑开整体布局
      }

      thead {
        background: rgba(56, 134, 245, 0.1);
        th {
          color: #f0f6fc;
          font-weight: 500;
        }
      }

      td, th {
        font-size: 14px;
        padding: 10px 14px; // 增加间距
        border: 1px solid rgba(240, 246, 252, 0.1);
      }

      hr {
        margin: 32px 0;
        border: 0;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      img {
        max-width: 100%;
        border-radius: 6px;
        margin: 16px auto;
        display: block;
      }
    }
  }

  // 滚动条轨道管理
  .c {
    flex: 1;
    flex-shrink: 0;
    overflow: auto;

    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: var(--bg0, rgba(255,255,255,0.05));
    }
  }

  // 主文章/预览文章标题样式
  .t {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding-bottom: 24px;
    margin-bottom: 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    position: relative;

    h1 {
      font-size: 32px;
      font-weight: 600;
      margin: 0;
      color: #ffffff;
      background: linear-gradient(132deg, rgb(165, 219, 255), rgb(182, 180, 245));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    button {
      position: absolute;
      right: 0;
      top: 5px;
      font-size: 24px;
      background: transparent;
      border: none;
      color: rgba(255,255,255,0.6);
      cursor: pointer;
      &:hover { color: #fff; }
    }
  }

  // 处于预览编辑模式 (.p) 下的特异性调整
  .p {
    max-width: 100%; // 预览模式拉满父容器
    background: var(--bg1, #161b22);
    overflow: hidden;

    .t {
      padding: 0 24px 16px;
    }

    .c {
      padding: 0 24px 20px;
      flex: 1;
      overflow: auto;
    }
  }
</style>
