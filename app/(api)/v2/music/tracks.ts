import type { APIRoute } from "astro";
import { music_stats } from "@/app/_comps/lib/music";

export const GET: APIRoute = async function tracks() {
  try {
    const data = await music_stats();
    return Response.json(data.tracks);
  } catch {
    return Response.json({ error: "lastfm" }, { status: 502 });
  }
};
