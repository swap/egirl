import type { APIRoute } from "astro";
import { music_stats } from "@/app/_comps/lib/music";

export const GET: APIRoute = async function albums() {
  try {
    const data = await music_stats();
    return Response.json(data.albums);
  } catch {
    return Response.json({ error: "lastfm" }, { status: 502 });
  }
};
