import type { APIRoute } from "astro";
import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";

export const GET: APIRoute = function info() {
  try {
    const text = readFileSync(join(process.cwd(), "static/data/info.yaml"), "utf8");
    return Response.json(parse(text));
  } catch {
    return Response.json({ error: "info" }, { status: 502 });
  }
};
