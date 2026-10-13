import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const bucket = process.env.WASABI_BUCKET_NAME!;
const region = process.env.WASABI_REGION!;

function client() {
  return new S3Client({
    region,
    endpoint: `https://s3.${region}.wasabisys.com`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.WASABI_ACCESS_KEY!,
      secretAccessKey: process.env.WASABI_SECRET_KEY!,
    },
  });
}

function to_url(key: string) {
  return `/api/file/${key}`;
}

async function list(folder: string) {
  const prefix = folder.endsWith("/") ? folder : `${folder}/`;
  const res = await client().send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }),
  );
  return (res.Contents || [])
    .filter((o) => o.Key && !o.Key.endsWith("/"))
    .map((o) => ({
      name: o.Key!.slice(prefix.length),
      url: to_url(o.Key!),
    }));
}

async function get(key: string) {
  return client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}

async function put(key: string, body: Buffer, type: string) {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: type,
    }),
  );
  if (key.startsWith("noah/")) bust_noah();
  return to_url(key);
}

async function remove(key: string) {
  await client().send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (key.startsWith("noah/")) bust_noah();
}

type NoahImg = { name: string; url: string };

const noah_store = globalThis as typeof globalThis & {
  noah_cache?: { at: number; data: NoahImg[] };
  noah_load?: Promise<NoahImg[]>;
};

const NOAH_TTL = 60_000;

function bust_noah() {
  noah_store.noah_cache = undefined;
  noah_store.noah_load = undefined;
}

async function get_noah(force = false) {
  const hit = noah_store.noah_cache;
  if (!force && hit && Date.now() - hit.at < NOAH_TTL) {
    return hit.data;
  }
  if (!force && noah_store.noah_load) return noah_store.noah_load;

  const load = list("noah")
    .then((data) => {
      noah_store.noah_cache = { at: Date.now(), data };
      noah_store.noah_load = undefined;
      return data;
    })
    .catch((err) => {
      noah_store.noah_load = undefined;
      throw err;
    });

  noah_store.noah_load = load;
  return load;
}

async function serve(key: string) {
  try {
    const res = await get(key);
    if (!res.Body) return new Response(null, { status: 404 });
    const bytes = await res.Body.transformToByteArray();
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": res.ContentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}

export { client, list, get, put, remove, get_noah, bust_noah, to_url, serve };
