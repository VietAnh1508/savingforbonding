import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { env } from "~/env";

function getClient() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function uploadAvatar(
  userId: string,
  file: Buffer,
  contentType: string,
  extension: string,
): Promise<string> {
  const key = `avatars/${userId}-${Date.now()}.${extension}`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    }),
  );

  return `${env.R2_PUBLIC_URL}/${key}`;
}

/** Best-effort delete of a previous avatar; only acts on URLs we own, and never throws. */
export async function deleteAvatarIfOwned(
  imageUrl: string | null,
): Promise<void> {
  if (!imageUrl || !env.R2_PUBLIC_URL) return;
  if (!imageUrl.startsWith(env.R2_PUBLIC_URL)) return;

  const key = imageUrl.slice(env.R2_PUBLIC_URL.length + 1);
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
    );
  } catch (error) {
    console.error("Failed to delete previous avatar from R2:", error);
  }
}
