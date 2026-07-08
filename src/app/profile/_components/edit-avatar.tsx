"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  ALLOWED_AVATAR_TYPES,
  AVATAR_SIZE_ERROR,
  AVATAR_TYPE_ERROR,
  MAX_AVATAR_SIZE_BYTES,
} from "~/lib/avatar";

export function EditAvatar({
  image,
  name,
}: {
  image: string | null | undefined;
  name: string | null | undefined;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);

    if (!(file.type in ALLOWED_AVATAR_TYPES)) {
      setError(AVATAR_TYPE_ERROR);
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setError(AVATAR_SIZE_ERROR);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Failed to upload avatar");
      }

      setPreview(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload avatar");
      setPreview(null);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
    }
  }

  const displayImage = preview ?? image;

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Change avatar"
        title="Change avatar"
        className="group relative h-10 w-10 shrink-0 rounded-full sm:h-16 sm:w-16"
      >
        {displayImage ? (
          <Image
            src={displayImage}
            alt={name ?? "User"}
            width={64}
            height={64}
            className="h-10 w-10 rounded-full object-cover sm:h-16 sm:w-16"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-lg sm:h-16 sm:w-16 sm:text-2xl">
            {(name ?? "?")[0]}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition group-hover:opacity-100">
          {uploading ? (
            <svg
              className="h-4 w-4 animate-spin text-white sm:h-5 sm:w-5"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="sm:h-5 sm:w-5"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={Object.keys(ALLOWED_AVATAR_TYPES).join(",")}
        onChange={handleFileChange}
        className="hidden"
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
