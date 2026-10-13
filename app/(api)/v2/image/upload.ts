import type { APIRoute } from "astro";
import { bust_noah, get_noah, put, remove } from "@/app/_comps/lib/bucket";
import { noah_ok } from "@/app/_comps/lib/noah";

function deny() {
  return Response.json({ error: "not allowed" }, { status: 403 });
}

function safe_name(name: string) {
  const base = name.split(/[/\\]/).pop() || "image";
  return base.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 180) || "image";
}

export const POST: APIRoute = async function upload({ request, clientAddress }) {
  if (!noah_ok(request, clientAddress)) return deny();
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "file required" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return Response.json({ error: "image required" }, { status: 400 });
    }
    const name = safe_name(file.name);
    const key = `noah/${Date.now()}-${name}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const url = await put(key, buf, file.type || "application/octet-stream");
    bust_noah();
    const images = await get_noah(true);
    return Response.json({ key, url, name: key.slice("noah/".length), images });
  } catch {
    return Response.json({ error: "bucket" }, { status: 502 });
  }
};

export const DELETE: APIRoute = async function destroy({
  request,
  clientAddress,
}) {
  if (!noah_ok(request, clientAddress)) return deny();
  try {
    const key = new URL(request.url).searchParams.get("path");
    if (!key || !key.startsWith("noah/")) return deny();
    await remove(key);
    bust_noah();
    const images = await get_noah(true);
    return Response.json({ ok: true, key, images });
  } catch {
    return Response.json({ error: "bucket" }, { status: 502 });
  }
};
