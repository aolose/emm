<script>
    import {onDestroy, onMount} from "svelte";
    import {fade} from "svelte/transition";

    export let type
    let cvs, w, h, task = {};

    const r180 = 180 / Math.PI

    function fn(a, r = 100) {
        a = a % 360
        return [
            (0.5 + Math.abs(Math.sin(a / r180)) / 2) * r,
            (0.5 + Math.abs(Math.cos(a / r180)) / 2) * r
        ]
    }

    let stop = 0

    function o(a) {
        return a / 180 * Math.PI
    }

    function run() {
        if (stop) return;
        const {t} = task;
        t && t()
        requestAnimationFrame(run)
    }

    onMount(run);

    onDestroy(() => {
        stop = 1;
    })

    $:{
        if (cvs) {
            cvs.width = w
            cvs.height = h
            const th = Math.min(60 + 15 * Math.min(800 / w, 1), 180)
            const ww = Math.max(w / 10 - 10, 0)
            const ctx = cvs.getContext('2d')
            let a = 0, b = 0;
            const drawCurve = (th, ow) => {
                ctx.beginPath()
                ctx.moveTo(w, 0)
                const sinN = Math.sin(o(th))
                const cosN = Math.cos(o(th))
                const c = h / sinN
                const sp = c / 3

                function cr(n, k) {
                    const t = n + sp
                    const [rx, ry] = fn(a, (sp * (k || -1)) / 4)
                    const [x, y] = pos(t)
                    const [x0, y0] = pos(t - sp / 2)
                    const [x1, y1] = [x0 + rx, y0 + ry]
                    ctx.quadraticCurveTo(x1, y1, x, y)
                }

                function pos(n) {
                    const y = n * sinN
                    const x = n * cosN
                    return [w - x - ow, y]
                }

                const st = Math.floor(b / sp) + 2
                for (let i = -st; i < -st + 5; i++) {
                    cr(b + sp * i, Math.abs(i % 2))
                }
            }

            const draw = (m, n) => {
                a += 0.2
                b++
                a = a % 360;
                ctx.clearRect(0, 0, w, h)
                const k = 2
                const p = n / k / 20
                switch (type) {
                    case 1:
                        ctx.strokeStyle = '#2a518a'
                        drawCurve(m - k + 15, n - p - 1)
                        ctx.stroke()
                        ctx.strokeStyle = '#464f5d'
                        drawCurve(m - k + 5, n - p - 10)
                        ctx.stroke()
                        ctx.strokeStyle = '#121623'
                        drawCurve(m - k - 4, n - p - 30)
                        ctx.stroke()
                        return
                    case 2:
                        ctx.strokeStyle = '#503585'
                        drawCurve(m - k + 13, n - p - 1)
                        ctx.stroke()
                        ctx.strokeStyle = '#334e52'
                        drawCurve(m - k + 8, n - p - 10)
                        ctx.stroke()
                        ctx.strokeStyle = '#121623'
                        drawCurve(m - k - 3, n - p - 30)
                        ctx.stroke()
                        return
                    default:
                        drawCurve(m, n)
                        ctx.lineTo(w, h)
                        const c = '#0b1017'
                        ctx.fillStyle=c
                        ctx.fill()
                        ctx.strokeStyle = c
                        drawCurve(m - k, n - p)
                        ctx.stroke()
                        ctx.strokeStyle = '#131b22'
                        drawCurve(m - k, n - p - 1)
                        ctx.stroke()
                }
            };

            task.t = () => {
                draw(th, ww)
            }
        }
    }
</script>
<div class="ctx"
     transition:fade
     bind:offsetWidth={w}
     bind:offsetHeight={h}
>
    <canvas bind:this={cvs}></canvas>
</div>
<style lang="scss">
  canvas {
    display: block;
  }

  .ctx {
    transition: .3s ease-in-out;
    z-index: 0;
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
  }
</style>