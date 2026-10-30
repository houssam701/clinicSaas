"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SHOW_DELAY_MS = 150; // background requests faster than this never flash the bar
const TRICKLE_MS = 300;
const NAV_TIMEOUT_MS = 15000; // safety net if a navigation never completes

/** Next.js prefetches links in the background; those should not show the bar. */
function isPrefetch(input: RequestInfo | URL, init?: RequestInit): boolean {
  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined)
  );
  return headers.has("next-router-prefetch") || headers.has("next-router-segment-prefetch");
}

/** True when `url` points to another page of this app that the router will handle. */
function isAppNavigation(url: URL): boolean {
  if (url.origin !== window.location.origin) return false;
  return url.pathname !== window.location.pathname || url.search !== window.location.search;
}

type Controller = { startNavigation: () => void; endNavigation: () => void };

/**
 * TopLoader
 *
 * A thin progress line at the top of the page. It runs while:
 *   - any fetch is in flight (API calls, server actions, router requests), and
 *   - a link click or GET form submit is navigating, until the URL changes.
 * Navigations are tracked separately because Next.js can answer them from its
 * prefetch cache without any fetch at all.
 *
 * No dependencies; the bar is animated with a CSS transform written straight to
 * the DOM, so it never re-renders React.
 */
export function TopLoader() {
  const barRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<Controller | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const originalFetch = window.fetch;
    let pending = 0;
    let progress = 0;
    let visible = false;
    let navigating = false;
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let trickleTimer: ReturnType<typeof setInterval> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let navTimer: ReturnType<typeof setTimeout> | undefined;

    const render = () => {
      bar.style.transform = `scaleX(${progress})`;
    };

    const show = () => {
      clearTimeout(showTimer);
      showTimer = undefined;
      if (visible) return;
      visible = true;
      clearTimeout(hideTimer);
      progress = 0.08;
      bar.style.transition = "none";
      render();
      bar.style.opacity = "1";
      // Force a reflow so the next transform change animates from 0.08
      void bar.offsetWidth;
      bar.style.transition = "transform 300ms ease-out, opacity 300ms ease";
      trickleTimer = setInterval(() => {
        // Approach 90% ever more slowly until the work finishes
        progress += (0.9 - progress) * 0.15;
        render();
      }, TRICKLE_MS);
    };

    const finish = () => {
      clearTimeout(showTimer);
      showTimer = undefined;
      clearInterval(trickleTimer);
      trickleTimer = undefined;
      if (!visible) return;
      visible = false;
      progress = 1;
      render();
      hideTimer = setTimeout(() => {
        bar.style.opacity = "0";
      }, 200);
    };

    const start = (immediate: boolean) => {
      pending += 1;
      if (immediate) show();
      else if (!visible && !showTimer) showTimer = setTimeout(show, SHOW_DELAY_MS);
    };

    const end = () => {
      pending = Math.max(0, pending - 1);
      if (pending === 0) finish();
    };

    const startNavigation = () => {
      if (navigating) return;
      navigating = true;
      start(true); // the user clicked, so give feedback right away
      navTimer = setTimeout(endNavigation, NAV_TIMEOUT_MS);
    };

    const endNavigation = () => {
      clearTimeout(navTimer);
      if (!navigating) return;
      navigating = false;
      end();
    };

    controllerRef.current = { startNavigation, endNavigation };

    // 1. Every fetch made in the browser
    window.fetch = (input, init) => {
      if (isPrefetch(input, init)) return originalFetch(input, init);
      start(false);
      return originalFetch(input, init).finally(end);
    };

    // 2. Link clicks that the router will turn into a navigation
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || !anchor.href || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (isAppNavigation(new URL(anchor.href))) startNavigation();
    };

    // 3. GET forms (search and filter forms) navigate to a new URL too
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement;
      if (form.method.toLowerCase() !== "get") return;
      const url = new URL(form.action || window.location.href);
      url.search = new URLSearchParams(
        new FormData(form, event.submitter) as unknown as Record<string, string>
      ).toString();
      if (isAppNavigation(url)) startNavigation();
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);

    return () => {
      window.fetch = originalFetch;
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      clearTimeout(showTimer);
      clearInterval(trickleTimer);
      clearTimeout(hideTimer);
      clearTimeout(navTimer);
      controllerRef.current = null;
    };
  }, []);

  // The URL changed, so the navigation has rendered
  useEffect(() => {
    controllerRef.current?.endNavigation();
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]"
    >
      <div
        ref={barRef}
        className="h-full w-full origin-left bg-primary shadow-[0_0_8px_rgba(38,98,240,0.6)] will-change-transform"
        style={{ transform: "scaleX(0)", opacity: 0 }}
      />
    </div>
  );
}
