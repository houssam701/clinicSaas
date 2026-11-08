"use client";

import { useEffect, useState } from "react";
import { Playfair_Display } from "next/font/google";
import { WELCOME_COOKIE } from "@/config/welcome";

/** The welcome's own typeface; only this screen loads it. */
const welcomeFont = Playfair_Display({ subsets: ["latin"], style: "italic", weight: "700", display: "swap" });

/** Time between two letters, shortened for long names so typing never drags. */
const MAX_STEP_MS = 55;
const MAX_TYPING_MS = 1300;
/** How long the finished sentence stays before fading. */
const HOLD_MS = 1100;
/** Must match welcome-overlay-out in globals.css. */
const FADE_MS = 500;

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * The pieces that appear one by one in each word. Arabic letters join and
 * change shape, so splitting them would break the word: it appears whole.
 */
function piecesOf(word: string): string[] {
  if (/\p{Script=Arabic}/u.test(word)) return [word];
  return Array.from(graphemes.segment(word), (s) => s.segment);
}

function clearWelcomeCookie() {
  document.cookie = `${WELCOME_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/**
 * Shown once after signing in: the page blurs and "Welcome back <name>" appears
 * in italic, letter by letter, in the center (the greeting in the primary color,
 * the name in white on a primary highlight), then everything fades away.
 * A click or Esc skips it.
 */
export function WelcomeOverlay({ firstName }: { firstName: string }) {
  const [visible, setVisible] = useState(true);

  const text = `Welcome back ${firstName}`;
  const greetingWords = ["Welcome", "back"].map(piecesOf);
  const nameWords = firstName.trim().split(/\s+/).map(piecesOf);
  const words = [...greetingWords, ...nameWords];
  const pieceCount = words.reduce((sum, word) => sum + word.length, 0);
  const stepMs = Math.min(MAX_STEP_MS, MAX_TYPING_MS / pieceCount);
  const fadeDelayMs = Math.round(pieceCount * stepMs + HOLD_MS);

  useEffect(() => {
    clearWelcomeCookie();
    const timer = setTimeout(() => setVisible(false), fadeDelayMs + FADE_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisible(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [fadeDelayMs]);

  if (!visible) return null;

  // Letters of one word stay together when the line wraps
  const renderWord = (pieces: string[], w: number) => (
    <span className="inline-block whitespace-nowrap">
      {pieces.map((piece, p) => (
        <span
          key={p}
          className="welcome-letter"
          style={{ animationDelay: `${Math.round((words.slice(0, w).flat().length + p) * stepMs)}ms` }}
        >
          {piece}
        </span>
      ))}
    </span>
  );

  return (
    <div
      role="status"
      onClick={() => setVisible(false)}
      className="welcome-overlay fixed inset-0 z-[100] flex items-center justify-center bg-white/30 p-6 backdrop-blur-xl dark:bg-slate-950/40"
      style={{ animationDelay: `0ms, ${fadeDelayMs}ms` }}
    >
      <p className={`${welcomeFont.className} text-center text-4xl leading-snug text-primary sm:text-6xl sm:leading-snug`}>
        <span className="sr-only">{text}</span>
        {greetingWords.map((pieces, w) => (
          <span key={w} aria-hidden="true">
            {renderWord(pieces, w)}{" "}
          </span>
        ))}
        {/* The name: white on a primary highlight, which appears as its first letter starts */}
        <span
          aria-hidden="true"
          className="welcome-letter rounded-lg bg-primary px-3 pb-1 text-white sm:px-4"
          style={{ animationDelay: `${Math.round(greetingWords.flat().length * stepMs)}ms` }}
        >
          {nameWords.map((pieces, w) => (
            <span key={w}>
              {w > 0 && " "}
              {renderWord(pieces, greetingWords.length + w)}
            </span>
          ))}
        </span>
      </p>
    </div>
  );
}
