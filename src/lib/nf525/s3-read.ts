import { createHash, createHmac } from "node:crypto";

/**
 * Lecture des archives fiscales Z sur le WORM S3 — SIGNATURE SigV4 À LA MAIN, zéro dépendance.
 * Server-only (les identifiants sont des variables d'environnement, jamais exposées au client).
 *
 * Accès en LECTURE SEULE : l'utilisateur IAM `logones-nf525-reader` ne peut ni écrire ni supprimer
 * (un PUT renvoie 403 AccessDenied). La clé d'upload, elle, est écriture seule et vit côté POS.
 * Le bucket est en Object Lock COMPLIANCE 10 ans.
 */

const REGION = "eu-west-3";
const BUCKET = process.env.NF525_S3_BUCKET ?? "logones-nf525-archives-603013471291-eu-west-3-an";
const HOST = `${BUCKET}.s3.${REGION}.amazonaws.com`;

const sha256hex = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const hmac = (key: Buffer | string, s: string) => createHmac("sha256", key).update(s).digest();

/** URI-encode AWS : seuls A-Z a-z 0-9 - . _ ~ restent littéraux. */
function uriEncode(str: string): string {
  let out = "";
  for (const b of Buffer.from(str, "utf8")) {
    const ch = String.fromCharCode(b);
    out += /[A-Za-z0-9\-._~]/.test(ch) ? ch : "%" + b.toString(16).toUpperCase().padStart(2, "0");
  }
  return out;
}

function credentials(): { accessKeyId: string; secretAccessKey: string } {
  const accessKeyId = process.env.NF525_S3_READ_ACCESS_KEY_ID;
  const secretAccessKey = process.env.NF525_S3_READ_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("NF525_S3_READ_ACCESS_KEY_ID / NF525_S3_READ_SECRET_ACCESS_KEY manquants");
  }
  return { accessKeyId, secretAccessKey };
}

/** Requête S3 GET signée SigV4 (en-tête Authorization). `path` = clé S3 (vide pour le bucket). */
async function s3Get(path: string, query: Record<string, string> = {}): Promise<{ status: number; body: string }> {
  const { accessKeyId, secretAccessKey } = credentials();
  const amzDate = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256hex("");

  const canonicalUri = "/" + path.split("/").map(uriEncode).join("/");
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${uriEncode(k)}=${uriEncode(query[k])}`)
    .join("&");

  // En-têtes signés, triés alphabétiquement (host inclus dans la signature, posé par fetch).
  const signedMap: Record<string, string> = {
    host: HOST,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  const names = Object.keys(signedMap).sort();
  const canonicalHeaders = names.map((n) => `${n}:${signedMap[n]}\n`).join("");
  const signedHeaders = names.join(";");

  const canonicalRequest = ["GET", canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join(
    "\n",
  );
  const scope = `${dateStamp}/${REGION}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256hex(canonicalRequest)].join("\n");

  let key = hmac(`AWS4${secretAccessKey}`, dateStamp);
  key = hmac(key, REGION);
  key = hmac(key, "s3");
  key = hmac(key, "aws4_request");
  const signature = createHmac("sha256", key).update(stringToSign).digest("hex");

  const res = await fetch(`https://${HOST}${canonicalUri}${canonicalQuery ? `?${canonicalQuery}` : ""}`, {
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
    },
  });
  return { status: res.status, body: await res.text() };
}

/** Extraction d'éléments XML (S3 répond en XML sur les listings). */
function xmlAll(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}>(.*?)</${tag}>`, "gs"))].map((m) => m[1]);
}

export interface S3ArchiveRef {
  key: string;
  size: number;
  lastModified: string;
}

/** Préfixe des archives d'un établissement. La date du chemin = date d'UPLOAD, PAS le jour d'exploitation. */
export function establishmentPrefix(organizationId: string, establishmentId: string): string {
  return `nf525/${organizationId}/${establishmentId}/`;
}

/** Liste toutes les archives sous un préfixe (pagination gérée). */
export async function listArchives(prefix: string): Promise<S3ArchiveRef[]> {
  const out: S3ArchiveRef[] = [];
  let token: string | undefined;
  do {
    const query: Record<string, string> = { "list-type": "2", prefix, "max-keys": "1000" };
    if (token) query["continuation-token"] = token;
    const { status, body } = await s3Get("", query);
    if (status !== 200) throw new Error(`S3 list ${status} : ${body.slice(0, 200)}`);
    for (const c of xmlAll(body, "Contents")) {
      out.push({
        key: xmlAll(c, "Key")[0],
        size: Number(xmlAll(c, "Size")[0]),
        lastModified: xmlAll(c, "LastModified")[0],
      });
    }
    token = xmlAll(body, "NextContinuationToken")[0];
  } while (token);
  return out;
}

/** Récupère et parse une archive. */
export async function getArchive(key: string): Promise<unknown> {
  const { status, body } = await s3Get(key);
  if (status !== 200) throw new Error(`S3 get ${status} : ${body.slice(0, 200)}`);
  return JSON.parse(body) as unknown;
}
