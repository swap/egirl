import { defineMiddleware } from "astro:middleware";
import { gate } from "@/app/_comps/lib/pbx";

export const onRequest = defineMiddleware(async (ctx, next) => {
  const path = ctx.url.pathname;
  if (path.startsWith("/api/")) return gate(ctx.request, next);
  const res = await next();
  if (res.status === 404) return ctx.redirect("/");
  return res;
});
