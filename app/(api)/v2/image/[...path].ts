import type { APIRoute } from "astro";
import { serve } from "@/app/_comps/lib/bucket";

export const GET: APIRoute = async function get_image({ params }) {
  const path = params.path || "";
  return serve(path);
};
