<script>
    import {onMount} from "svelte";
    import '$lib/components/easymde.scss'
    import {editPost, filesUpload, selectFile} from "$lib/store";
    import {createFileMd, createUrl, file2Md} from "$lib/utils";

    let title = ''
    let e = ''
    let editor
    let draft
    $:{
        if (editor) editPost.update(p => {
            if (editor && editor.value() !== draft) editor.value(draft)
            return {
                ...p, draft, title
            }
        })
    }
    onMount(async () => {
        const eModule = await import('easymde')
        const Easy = eModule.default
        editor = new Easy({
            element: e,
            spellChecker: false,
            uploadImage: true,
            syncSideBySidePreviewScroll: false,
            imageUploadFunction: (f) => {
                const cm = editor.codemirror
                const url = createUrl(f)
                cm.replaceSelection(`${createFileMd(f,url)}`)
                filesUpload([f], (o) => {
                    const x = createUrl(o)
                    let l = cm.lineCount()
                    while (l--) {
                        const v = cm.getLine(l)
                        const idx = v.indexOf(url)
                        if (idx !== -1) {
                            cm.replaceRange(x, {line: l, ch: idx}, {line: l, ch: idx + url.length})
                        }
                    }
                })

            },
            shortcuts: {
                preview: null,
                fullscreen: null,
                guide: null,
                'upload-image': null,
            },
            toolbar: [
                'bold', 'italic', 'strikethrough', 'heading-smaller',
                'heading-bigger', 'code', 'quote', 'unordered-list',
                'ordered-list', 'link', 'table', {
                    name: "image",
                    action: async (editor) => {
                        const f = await selectFile()
                        if (f && f.length) {
                            editor.codemirror.replaceSelection(file2Md(f))
                        }
                    },
                    className: "icon i-create",
                    title: "Image",
                }
            ]
        })
        editor?.codemirror?.on("change", () => {
            editPost.update(p => ({
                ...p,
                draft: editor.value()
            }))
        });
        return editPost.subscribe(p => {
            draft = p.draft || p.content || '';
            title = p.title
        })
    })
</script>
<div class="a">
    <div class="t">
        <input bind:value={title}/>
        <button class="icon i-publish"></button>
    </div>
    <div class="e">
        <textarea class="d" bind:this={e}></textarea>
    </div>
</div>

<style lang="scss">
  .a {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .d {
    display: none
  }

  .e {
    flex: 1;
    line-height: 2;
    padding-bottom: 10px;
    overflow: hidden;
  }

  .t {
    display: flex;
    align-items: center;
    align-content: normal;
    padding: 0 8%;

    button {
      font-size: 30px;
    }
  }

  button {
    border: none;
    width: 40px;
    height: 40px;
    color: var(--darkgrey);
    background: none;
    margin-left: 5px;
    cursor: pointer;

    &:hover {
      color: #999;
    }
  }

  input {
    font-size: 40px;
    flex: 1;
    margin: 20px 20px 10px 0;
    padding: 0 10px;
    border: 0;
    resize: none;
    color: #556175;
    outline: none;
  }
</style>
