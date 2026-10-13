import type { APIRoute } from "astro";
import { list } from "@/app/_comps/lib/bucket";

export const GET: APIRoute = async function list_images({ params }) {
  try {
    const folder = params.folder!;
    const images = await list(folder);
    return Response.json(images);
  } catch {
    return Response.json({ error: "bucket" }, { status: 502 });
  }
};
