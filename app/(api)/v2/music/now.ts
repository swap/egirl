import type { APIRoute } from "astro";
import { live } from "@/app/_comps/lib/music";

export const GET: APIRoute = async function now({ request }) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let open = true;

      const close = () => {
        if (!open) return;
        open = false;
        try {
          controller.close();
        } catch {}
      };

      const send = (data: unknown) => {
        if (!open || request.signal.aborted) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          open = false;
        }
      };

      request.signal.addEventListener("abort", close, { once: true });

      void live(request.signal, send)
        .catch(() => {})
        .finally(close);
    },
    cancel() {},
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
};
