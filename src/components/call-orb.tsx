"use client";

import { cn } from "~/lib/utils";

type Mode = "idle" | "listening" | "thinking" | "speaking";

export function CallOrb({
  mode,
  volume,
}: {
  mode: Mode;
  volume: number;
}) {
  const scale = 1 + Math.min(volume, 1) * 0.28;

  return (
    <div className="relative mx-auto size-32 sm:size-44 lg:size-52">
      <div
        className={cn(
          "absolute inset-0 rounded-full border border-primary/15 motion-safe:transition-opacity",
          mode === "listening" && "opacity-100",
          mode !== "listening" && "opacity-70",
        )}
      />
      <div className="absolute inset-[7%] rounded-full border border-primary/25" />
      <div
        className={cn(
          "absolute inset-[18%] rounded-full bg-primary/12 motion-safe:transition-[transform,opacity] motion-reduce:transform-none",
          mode === "speaking" && "bg-primary/22",
          mode === "thinking" && "motion-safe:animate-[orb-breathe_1.8s_ease-in-out_infinite]",
          mode === "listening" && "bg-primary/16",
        )}
        style={mode === "thinking" ? undefined : { transform: `scale(${scale})` }}
      />
      <div
        className={cn(
          "absolute inset-[42%] rounded-full bg-primary motion-safe:transition-opacity",
          mode === "idle" && "opacity-40",
          mode === "thinking" && "opacity-70",
        )}
      />
    </div>
  );
}
