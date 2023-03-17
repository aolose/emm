import type { RequestHandler } from "@sveltejs/kit";
import { sitemap } from "$lib/sitemap";

export const GET:RequestHandler=({url})=>{
  const headers = {
    'Cache-Control': `max-age=0, s-max-age=${600}`,
    'Content-Type': 'application/xml'
  };
  return new Response(sitemap.render(url.origin),{headers})
}