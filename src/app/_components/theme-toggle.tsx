"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { MoonIcon } from "~/app/_components/icons/moon-icon";
import { SunIcon } from "~/app/_components/icons/sun-icon";

const options = [
  { value: "light", label: "Light theme", Icon: SunIcon },
  { value: "dark", label: "Dark theme", Icon: MoonIcon },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-7 w-20" />;

  return (
    <div className="flex items-center rounded-full border border-foreground/15 bg-foreground/5 p-0.5">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-label={label}
          className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
            theme === value
              ? "bg-card text-foreground shadow-sm"
              : "text-foreground/40 hover:text-foreground/70"
          }`}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
}
