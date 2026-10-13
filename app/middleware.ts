import { defineMiddleware } from "astro:middleware";
import { gate } from "@/app/_comps/lib/pbx";
import { embed, origin } from "@/app/_comps/lib/embed";

export const onRequest = defineMiddleware(async (ctx, next) => {
  const path = ctx.url.pathname;
  if (path.startsWith("/api/")) return gate(ctx.request, next);
  const res = await next();
  if (res.status === 404) return ctx.redirect("/");
  if (!res.headers.get("content-type")?.includes("text/html")) return res;

  let tags = "";
  try {
    tags = embed(origin(ctx.request, ctx.url));
  } catch {
    return res;
  }
  const html = (await res.text()).replace("</head>", `  ${tags}\n  </head>`);
  const headers = new Headers(res.headers);
  headers.delete("content-length");
  return new Response(html, { status: res.status, statusText: res.statusText, headers });
});
