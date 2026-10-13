import type { APIRoute } from "astro";
import { music_stats } from "@/app/_comps/lib/music";

export const GET: APIRoute = async function stats() {
  try {
    return Response.json(await music_stats());
  } catch {
    return Response.json({ error: "lastfm" }, { status: 502 });
  }
};
