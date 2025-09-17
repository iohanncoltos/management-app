import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "node:stream";

import { env } from "./env";

const endpoint = `https://${env.server.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

export const r2Client = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId: env.server.R2_ACCESS_KEY_ID,
    secretAccessKey: env.server.R2_SECRET_ACCESS_KEY,
  },
});

interface UploadParams {
  key: string;
  contentType: string;
  body: Buffer | Uint8Array | Blob | string | Readable;
  cacheControl?: string;
}

export async function uploadToR2({ key, contentType, body, cacheControl }: UploadParams) {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: env.server.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl ?? "private, max-age=0, must-revalidate",
    }),
  );

  return `${env.server.R2_PUBLIC_BASE_URL}/${key}`;
}

export async function getR2SignedUrl(key: string, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: env.server.R2_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

export async function deleteFromR2(key: string) {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: env.server.R2_BUCKET_NAME,
      Key: key,
    }),
  );
}
