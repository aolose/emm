import isbot from "isbot";

const botMark = (ua: string) => {
  let mark = 0;
  const r = isbot(ua);
  if (r) {
    mark = 1;
    // check shouldn't mark
    // mark = 2
  } else {
    //  check should mark
    //  mark = 1
  }
};