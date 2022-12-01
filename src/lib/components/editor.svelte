<script>
    import {onMount} from "svelte";
    import './easymde.scss'
    import {filesUpload, selectFile} from "$lib/store";
    import {createFileMd, createUrl, file2Md} from "$lib/utils";

    let e = ''
    let editor
    export let value = ''
    export let toolbar = []
    $:{
        if (editor && value !== editor.value())
            editor.value(value)
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
                cm.replaceSelection(`${createFileMd(f, url)}`)
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
                    className: "icon i-file",
                    title: "Files",
                }
            ].concat(toolbar)
        })
        editor.codemirror.on("change", () => {
            value = editor.value()
        });
    })
</script>

<div class="e">
    <textarea class="d" bind:this={e}></textarea>
</div>

<style lang="scss">
  .d {
    display: none
  }

  .e {
    height: 100%;
    overflow: hidden;
    line-height: 2;
    padding-bottom: 20px;
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
  }
</style>