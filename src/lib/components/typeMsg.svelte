<script>
    export let msg = ''
    const base = 'abcdefghijklmnopqrstuvwxyz齉齾爩鱻' +
        '癵籱饢驫鲡鹂鸾麣纞虋讟麷鞻韽韾响顟顠饙ㄅㄧㄥㄒㄧㄢㄘㄨ';
    const l = base.length;
    let pv = '';
    let pr = '';
    let a = 0;
    let t = -1;
    let start = 0
    export let defaultText = ""

    $:{
        if (defaultText && !start) {
            msg = defaultText
            start = 1
        }
        if (start) {
            clearTimeout(t);
            if ((msg + ' ' !== pv)) {
                t = setTimeout(function () {
                    if (a++ < 3) {
                        pr = base[Math.floor(Math.random() * l)];
                    } else {
                        clearTimeout(t);
                        t = -1;
                        a = 0;
                        pr = '';
                        pv = msg.substring(0, pv.length + 1) + ' ';
                    }
                }, 30)
            }
        }
    }
</script>
<p>
    {pv}{pr}
</p>
<style lang="scss">
  @import "./font/font.css";

  p {
    font-size: inherit;
    font-family: 'Architects Daughter', -apple-system,
    BlinkMacSystemFont, PingFang SC, Helvetica Neue, STHeiti,
    Microsoft Yahei, Tahoma, Simsun, sans-serif;
    color: inherit;
    text-align: inherit;
  }
</style>