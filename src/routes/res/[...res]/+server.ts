import type { RequestHandler } from "@sveltejs/kit";
import fs from "fs";
import { model, resp } from "$lib/server/utils";
import path from "path";
import { sys, db } from "$lib/server";
import { Res } from "$lib/server/model";
import { contentType } from "$lib/enum";

export const GET: RequestHandler = ({ params, request }) => {
  const tag = request.headers.get("If-None-Match");
  if (tag) {
    if (db.get(model(Res, { md5: tag }))) {
      return resp("", 204);
    }
  }
  const res = new Res();
  let p = params.res;
  let isThumb = false;
  if (p) {
    if (p.startsWith("_")) {
      p = p.slice(1);
      isThumb = true;
    }
    res.id = +p;
    const r = db.get(res);
    if (r) {
      let f: Buffer | undefined;
      const u = path.resolve(sys.uploadDir, p);
      const t = path.resolve(sys.thumbDir, p);
      if (isThumb && r.thumb) {
        if (fs.existsSync(t)) f = fs.readFileSync(t);
      }
      if (!f) {
        if (fs.existsSync(u)) f = fs.readFileSync(u);
      }
      const desc = "content-disposition";
      const h = new Headers();
      if (r.md5) {
        h.set("etag", r.md5);
      }
      const name = encodeURIComponent(r.name);
      h.set(contentType, r.type);
      if (!/image|text|video/i.test(r.type || "")) {
        h.set(desc, `attachment; filename=${name}`);
      } else {
        h.set(desc, `inline; filename=${name}`);
      }
      return new Response(f, {
        headers: h
      });
    }
  }
  return resp("Resources not exist!", 404);
};
