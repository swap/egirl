import type { APIRoute } from "astro";
import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";

export const GET: APIRoute = function sponsor() {
  try {
    const text = readFileSync(
      join(process.cwd(), "static/data/data.yaml"),
      "utf8",
    );
    const data = parse(text) as { sponsor?: Record<string, unknown> };
    const s = data.sponsor ?? {};
    return Response.json({
      ...s,
      url: process.env.sponsor || "",
    });
  } catch {
    return Response.json({ enabled: false }, { status: 502 });
  }
};
