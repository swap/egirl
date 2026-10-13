import type { APIRoute } from "astro";
import { get_noah } from "@/app/_comps/lib/bucket";
import { noah_ok } from "@/app/_comps/lib/noah";

export const GET: APIRoute = async function noah({ url, request, clientAddress }) {
  try {
    const force = url.searchParams.has("c");
    const images = await get_noah(force);
    const edit = noah_ok(request, clientAddress);
    return Response.json(
      { images, edit },
      {
        headers: {
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      },
    );
  } catch {
    return Response.json({ error: "bucket" }, { status: 502 });
  }
};
