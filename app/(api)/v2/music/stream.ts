import type { APIRoute } from "astro";
import {
  fav_audio,
  get_audio,
  load_track,
  peek_track,
  top_audio,
} from "@/app/_comps/lib/music";

function ogg(data: Buffer, id: string, range: string | null, cache = false) {
  const total = data.length;
  const base = {
    "Content-Type": "audio/ogg",
    "Accept-Ranges": "bytes",
    "X-Track-Id": id,
    ...(cache ? { "Cache-Control": "private, max-age=86400" } : {}),
  };

  const m = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (m && (m[1] || m[2])) {
    let start = m[1] ? Number(m[1]) : 0;
    let end = m[2] ? Number(m[2]) : total - 1;
    if (!m[1]) start = Math.max(0, total - Number(m[2]));
    end = Math.min(end, total - 1);
    if (start > end || start >= total) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${total}` },
      });
    }
    const chunk = data.subarray(start, end + 1);
    return new Response(new Uint8Array(chunk), {
      status: 206,
      headers: {
        ...base,
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Content-Length": String(chunk.length),
      },
    });
  }

  return new Response(new Uint8Array(data), {
    headers: { ...base, "Content-Length": String(total) },
  });
}

export const GET: APIRoute = async function stream({ request }) {
  const id = new URL(request.url).searchParams.get("id") || undefined;
  const range = request.headers.get("range");
  if (!id) return Response.json({ error: "none" }, { status: 404 });

  const cached = peek_track(id);
  if (cached) return ogg(cached.data, cached.id, range);

  try {
    let data = (await top_audio(id)) || (await fav_audio(id)) || null;

    if (!data) {
      await load_track(id);
      data = peek_track(id)?.data || null;
    }

    if (!data) data = await get_audio(id);
    if (!data) return Response.json({ error: "none" }, { status: 404 });
    return ogg(data, id, range, true);
  } catch {
    return Response.json({ error: "spotify" }, { status: 502 });
  }
};
