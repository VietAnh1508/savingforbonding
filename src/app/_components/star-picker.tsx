"use client";

import { useEffect, useRef, useState } from "react";
import { StarIcon } from "~/app/_components/icons/star-icon";
import { Tooltip } from "~/app/_components/tooltip";
import { MIN_STAR_MULTIPLIER, STAR_MULTIPLIER_STEP } from "~/lib/match";

// Two-step star picker for dense layouts: tap the star to place/remove it at
// the default multiplier, then tap the "×N" number to open a slider in a
// popover. Dragging the slider only updates the popover's own display —
// the new value is committed once the popover closes (click away, Escape,
// or tapping the number again).
export function StarPicker({
  multiplier,
  maxMultiplier,
  disabled = false,
  onPlace,
  onRemove,
  onChangeMultiplier,
  gapClassName = "gap-0.5",
}: {
  multiplier: number | null;
  maxMultiplier: number;
  disabled?: boolean;
  onPlace: () => void;
  onRemove: () => void;
  onChangeMultiplier: (multiplier: number) => void;
  gapClassName?: string;
}) {
  const starred = multiplier !== null;
  const [sliderOpen, setSliderOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState(multiplier ?? MIN_STAR_MULTIPLIER);
  // Fixed-position coords for the popover, computed on open — position:fixed
  // (like Tooltip) so it isn't clipped by a scrollable ancestor (e.g. the
  // day-predict modal's match list), unlike position:absolute.
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number } | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const numberButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (multiplier !== null) setPendingValue(multiplier);
  }, [multiplier]);

  function openSlider() {
    const rect = numberButtonRef.current?.getBoundingClientRect();
    if (rect) {
      setPopoverPos({ top: rect.top, right: window.innerWidth - rect.right });
    }
    setSliderOpen(true);
  }

  function closeAndCommit() {
    setSliderOpen(false);
    if (pendingValue !== multiplier) onChangeMultiplier(pendingValue);
  }

  useEffect(() => {
    if (!sliderOpen) return;

    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) closeAndCommit();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeAndCommit();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sliderOpen, pendingValue, multiplier]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center ${gapClassName}`}
    >
      <Tooltip label={starred ? "Remove star" : "Place a star"}>
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (starred) {
              setSliderOpen(false);
              onRemove();
            } else {
              onPlace();
            }
          }}
          aria-label={starred ? "Remove star" : "Place star"}
          aria-pressed={starred}
          className="flex items-center justify-center p-1 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <StarIcon filled={starred} color="yellow" />
        </button>
      </Tooltip>
      {starred && (
        <button
          ref={numberButtonRef}
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (sliderOpen) closeAndCommit();
            else openSlider();
          }}
          aria-label={`Adjust star multiplier, currently ×${multiplier}`}
          aria-expanded={sliderOpen}
          className="rounded px-1 text-xs font-medium text-amber-600 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-amber-400"
        >
          ×{multiplier}
        </button>
      )}
      {starred && sliderOpen && popoverPos && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: popoverPos.top - 8,
            right: popoverPos.right,
            transform: "translateY(-100%)",
          }}
          className="z-50 flex items-center gap-1.5 rounded-lg border border-foreground/10 bg-card p-2 shadow-lg"
        >
          <input
            type="range"
            min={MIN_STAR_MULTIPLIER}
            max={Math.max(maxMultiplier, MIN_STAR_MULTIPLIER)}
            step={STAR_MULTIPLIER_STEP}
            value={pendingValue}
            disabled={disabled}
            onChange={(e) => setPendingValue(Number(e.target.value))}
            aria-label="Star multiplier"
            className="h-1.5 w-20 cursor-pointer accent-amber-500 disabled:cursor-not-allowed"
          />
          <span className="w-6 shrink-0 text-xs font-medium text-amber-600 dark:text-amber-400">
            ×{pendingValue}
          </span>
        </div>
      )}
    </div>
  );
}

/** Read-only star + multiplier display for historical/voter-list views. */
export function StarBadge({
  multiplier,
  className = "",
}: {
  multiplier: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      <StarIcon filled color="yellow" />
      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
        ×{multiplier}
      </span>
    </span>
  );
}
