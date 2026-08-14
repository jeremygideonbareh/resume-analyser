"use client";

import { cn } from "@/lib/utils";
import { stagger, useAnimate, useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const graphemeSegmenter =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function segmentCharacters(text: string) {
  if (!graphemeSegmenter) return Array.from(text);
  return Array.from(graphemeSegmenter.segment(text), ({ segment }) => segment);
}

export interface FlippingWordSwapProps {
  /** The word or short phrase shown at rest. */
  word1: string;
  /** The word or short phrase revealed on interaction. */
  word2: string;
  /** Duration of each character flip in milliseconds. */
  duration?: number;
  /** Delay between neighboring character flips in milliseconds. */
  stagger?: number;
  /** Additional classes applied to the interactive container. */
  className?: string;
  /** Additional classes applied only to the revealed word. */
  toClassName?: string;
  /** Inline styles applied to the interactive container. */
  style?: CSSProperties;
  /** Inline styles applied only to the revealed word. */
  toStyle?: CSSProperties;
  /** Optional click handler (e.g. when the swap doubles as a CTA). */
  onClick?: () => void;
}

export function FlippingWordSwap({
  word1,
  word2,
  duration = 400,
  stagger: staggerMs = 44,
  className,
  toClassName,
  style,
  toStyle,
  onClick,
}: FlippingWordSwapProps) {
  const [scope, animate] = useAnimate();
  const swappedRef = useRef(false);
  const [isSwapped, setIsSwapped] = useState(false);
  const reduceMotion = useReducedMotion();

  // Resolve timings once; reduced motion collapses everything to instant.
  const resolvedDuration = reduceMotion ? 0 : Math.max(180, duration) / 1000;
  const resolvedStagger = reduceMotion ? 0 : Math.max(0, staggerMs) / 1000;

  const runSwap = useCallback(
    (next: boolean) => {
      swappedRef.current = next;
      setIsSwapped(next);

      const firstWord = '[data-flip-word="first"]';
      const secondWord = '[data-flip-word="second"]';

      if (next) {
        animate(
          firstWord,
          { rotateX: 82, opacity: 0 },
          {
            duration: resolvedDuration,
            delay: stagger(resolvedStagger),
            ease: "easeIn",
          },
        );
        animate(
          secondWord,
          { rotateX: 0, opacity: 1 },
          {
            duration: resolvedDuration,
            delay: stagger(resolvedStagger),
            ease: "easeOut",
          },
        );
      } else {
        animate(
          firstWord,
          { rotateX: 0, opacity: 1 },
          {
            duration: resolvedDuration,
            delay: stagger(resolvedStagger),
            ease: "easeOut",
          },
        );
        animate(
          secondWord,
          { rotateX: -82, opacity: 0 },
          {
            duration: resolvedDuration,
            delay: stagger(resolvedStagger),
            ease: "easeIn",
          },
        );
      }
    },
    [animate, resolvedDuration, resolvedStagger],
  );

  // Initial resting state: first word visible, second hidden below.
  useEffect(() => {
    animate(
      '[data-flip-word="first"]',
      { rotateX: 0, opacity: 1 },
      { duration: 0 },
    );
    animate(
      '[data-flip-word="second"]',
      { rotateX: -82, opacity: 0 },
      { duration: 0 },
    );
  }, [animate]);

  const renderCharacters = (text: string, layer: "first" | "second") =>
    segmentCharacters(text).map((character, index) => (
      <span
        key={`${layer}-${index}-${character}`}
        data-flip-word={layer}
        className="inline-block whitespace-pre [backface-visibility:hidden] [will-change:transform,opacity]"
      >
        {character === " " ? "\u00a0" : character}
      </span>
    ));

  return (
    <button
      ref={scope}
      type="button"
      className={cn(
        "relative inline-grid cursor-pointer select-none border-0 bg-transparent p-0 align-baseline font-[inherit] leading-[inherit] tracking-[inherit] text-[inherit]",
        "rounded-[0.08em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30 focus-visible:ring-offset-2",
        className,
      )}
      aria-label={isSwapped ? word2 : word1}
      aria-pressed={isSwapped}
      style={style}
      onMouseEnter={() => runSwap(true)}
      onMouseLeave={() => runSwap(false)}
      onPointerUp={(event) => {
        if (event.pointerType !== "mouse") runSwap(!swappedRef.current);
      }}
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible")) runSwap(true);
      }}
      onBlur={() => runSwap(false)}
      onClick={onClick}
    >
      <span className="col-start-1 row-start-1 inline-grid overflow-hidden [perspective:800px]">
        <span
          className="col-start-1 row-start-1 inline-flex items-baseline justify-center gap-[0.012em] whitespace-pre"
          aria-hidden="true"
        >
          {renderCharacters(word1, "first")}
        </span>
        <span
          className={cn(
            "col-start-1 row-start-1 inline-flex items-baseline justify-center gap-[0.012em] whitespace-pre",
            toClassName,
          )}
          aria-hidden="true"
          style={toStyle}
        >
          {renderCharacters(word2, "second")}
        </span>
      </span>
    </button>
  );
}