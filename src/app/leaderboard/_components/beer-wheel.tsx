"use client";

import { useEffect, useRef } from "react";

import {
  BEER_AMOUNT_OPTIONS,
  formatBeerAmount,
  segmentMidAngle,
  WHEEL_SEGMENT_ANGLE,
} from "~/lib/beer-amount-spin";

// Evenly-spaced hues so the wheel always gets one distinct color per
// segment, no matter how many BEER_AMOUNT_OPTIONS there are.
const SEGMENT_COLORS = BEER_AMOUNT_OPTIONS.map(
  (_, i) => `hsl(${(360 * i) / BEER_AMOUNT_OPTIONS.length}, 75%, 50%)`,
);
const WHEEL_SIZE = 256;
const LABEL_RADIUS = 90;
const SPIN_DURATION_MS = 4000;
const SPIN_FALLBACK_MS = SPIN_DURATION_MS + 200;

const WHEEL_BACKGROUND = `conic-gradient(${BEER_AMOUNT_OPTIONS.map(
  (_, i) =>
    `${SEGMENT_COLORS[i]} ${i * WHEEL_SEGMENT_ANGLE}deg ${(i + 1) * WHEEL_SEGMENT_ANGLE}deg`,
).join(", ")})`;

interface BeerWheelProps {
  rotation: number;
  spinning: boolean;
  onSpinComplete?: () => void;
}

export function BeerWheel({ rotation, spinning, onSpinComplete }: BeerWheelProps) {
  const firedRef = useRef(false);
  const onCompleteRef = useRef(onSpinComplete);

  useEffect(() => {
    onCompleteRef.current = onSpinComplete;
  }, [onSpinComplete]);

  // Fallback in case `transitionend` doesn't fire (e.g. backgrounded tab) —
  // this is what actually unblocks the modal's "done" phase, so it must be reliable.
  useEffect(() => {
    if (!spinning) return;
    firedRef.current = false;
    const timeout = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true;
        onCompleteRef.current?.();
      }
    }, SPIN_FALLBACK_MS);
    return () => clearTimeout(timeout);
  }, [spinning, rotation]);

  function handleTransitionEnd() {
    if (!spinning || firedRef.current) return;
    firedRef.current = true;
    onCompleteRef.current?.();
  }

  return (
    <div
      className="relative mx-auto"
      style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
    >
      <div
        className="absolute -top-3 left-1/2 z-10 h-0 w-0 -translate-x-1/2 border-x-8 border-t-[14px] border-x-transparent border-t-foreground"
        aria-hidden
      />
      {/*
        The circular clip (rounded-full + overflow-hidden) must live on a
        non-rotating wrapper. Putting border-radius and `transform: rotate`
        on the same element causes the browser to anti-alias the clip path
        every frame, which leaves faint seams of the page background peeking
        through at the rim. A static outer mask around a rotating inner
        layer clips cleanly at any angle.
      */}
      <div className="h-full w-full overflow-hidden rounded-full border-4 border-foreground/10 shadow-lg">
        <div
          onTransitionEnd={handleTransitionEnd}
          className="h-full w-full"
          style={{
            background: WHEEL_BACKGROUND,
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`
              : "none",
          }}
        >
          {BEER_AMOUNT_OPTIONS.map((amount) => {
            // Text reads outward from the hub toward the rim: rotate so the
            // label's own reading direction (local x-axis) points along the
            // segment's radial direction, then center the label (both
            // axes) on the point LABEL_RADIUS out from the hub — the
            // `calc(...- 50%)` keeps it centered there regardless of how
            // wide each amount's text is.
            const midAngle = segmentMidAngle(amount);
            return (
              <span
                key={amount}
                className="absolute left-1/2 top-1/2 origin-top-left whitespace-nowrap text-sm font-bold text-white"
                style={{
                  transform: `rotate(${midAngle - 90}deg) translate(calc(${LABEL_RADIUS}px - 50%), -50%)`,
                }}
              >
                {formatBeerAmount(amount)}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
