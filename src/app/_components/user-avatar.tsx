import Image from "next/image";

export function UserAvatar({
  name,
  image,
  size = 32,
  fallbackClassName = "",
}: {
  name: string | null;
  image: string | null;
  size?: number;
  fallbackClassName?: string;
}) {
  const label = name?.trim() || "Anonymous";
  const style = { width: size, height: size };

  if (image) {
    return (
      <Image
        src={image}
        alt={label}
        width={size}
        height={size}
        style={style}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      style={style}
      className={`flex shrink-0 items-center justify-center rounded-full ${fallbackClassName}`}
    >
      {[...label][0]}
    </span>
  );
}
