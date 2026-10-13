import type { APIRoute } from "astro";
import { get_lyric } from "@/app/_comps/lib/music";

export const GET: APIRoute = async function lyric({ request }) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return Response.json({ error: "id required" }, { status: 400 });
    }
    const data = await get_lyric(id);
    if (!data) return Response.json({ error: "none" }, { status: 404 });
    return Response.json(data);
  } catch {
    return Response.json({ error: "spotify" }, { status: 502 });
  }
};
