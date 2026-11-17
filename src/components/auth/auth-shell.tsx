import type { ReactNode } from "react";
import Image from "next/image";
import { Logo } from "@/components/shared/Logo";
import { PATHS } from "@/config/path";

/**
 * Layout of the signed-out pages (sign in, forgot password, reset password).
 * Split screen. Left: a flat brand panel with the logo and a quote (hidden on
 * small screens). Right: the logo, a heading and the page's form.
 */
export function AuthShell({
  heading,
  title,
  subtitle,
  children,
}: {
  /** Screen-reader page heading, e.g. "Sign in to BienSync" */
  heading: string;
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bgColor font-sans">
      {/* Left: brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-blue-50 text-white p-12 xl:p-16">
        {/* Decorative background */}
        <Image src="/assets/bg/loginbg.png" alt="" fill priority sizes="50vw" className="object-cover object-center" />
        {/* Blur + dark tint so the white text stays readable */}
        <div aria-hidden className="absolute inset-0 backdrop-blur-md bg-slate-900/40" />

        <Logo size="md" tone="inverse" animated={false} className="relative" />

        <figure className="relative max-w-xl">
          <blockquote className="text-3xl xl:text-4xl font-semibold leading-snug tracking-tight text-white">
            &ldquo;Efficiency is doing things right; effectiveness is doing the right things.&rdquo;
          </blockquote>
          <figcaption className="mt-8">
            <span className="block text-lg font-bold text-white">Peter F. Drucker</span>
            <span className="block text-white/80">Management consultant, 1909&ndash;2005</span>
          </figcaption>
        </figure>
      </aside>

      {/* Right: the page's form */}
      <main className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <h1 className="sr-only">{heading}</h1>
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo size="xl" href={PATHS.home} />
            <p className="mt-8 text-2xl font-semibold tracking-tight text-slate-800">{title}</p>
            <p className="mt-1 text-slate-600">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
