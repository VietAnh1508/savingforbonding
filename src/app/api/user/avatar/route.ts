import { NextResponse } from "next/server";

import {
  ALLOWED_AVATAR_TYPES,
  AVATAR_SIZE_ERROR,
  AVATAR_TYPE_ERROR,
  MAX_AVATAR_SIZE_BYTES,
} from "~/lib/avatar";
import { deleteAvatarIfOwned, uploadAvatar } from "~/server/services/r2";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const extension = ALLOWED_AVATAR_TYPES[file.type];
  if (!extension) {
    return NextResponse.json({ error: AVATAR_TYPE_ERROR }, { status: 400 });
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return NextResponse.json({ error: AVATAR_SIZE_ERROR }, { status: 400 });
  }

  const current = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { image: true },
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadAvatar(
    session.user.id,
    buffer,
    file.type,
    extension,
  );

  await db.user.update({
    where: { id: session.user.id },
    data: { image: url },
  });

  await deleteAvatarIfOwned(current.image);

  return NextResponse.json({ image: url });
}
