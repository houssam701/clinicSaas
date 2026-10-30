import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import Image from "next/image";
import { Logo } from "@/components/shared/Logo";
import { redirectIfAuthenticated } from "@/services/page-guard";

export const metadata: Metadata = {
  title: "Sign in | BienSync Clinic OS",
  description: "Secure doctor and staff portal for BienSync clinic management.",
};

/**
 * Server Component: BienSyncLogin Page
 *
 * Split screen. Left: a flat brand panel with the logo and a quote
 * (hidden on small screens). Right: the sign-in form.
 * Only the form itself is a client component.
 */
export default async function BienSyncLogin() {
  await redirectIfAuthenticated();

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bgColor font-sans">
      {/* Left: brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-blue-50 text-white p-12 xl:p-16">
        {/* Decorative background */}
        <Image
          src="/assets/bg/loginbg.png"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover object-center"
        />
        {/* Blur + dark tint so the white text stays readable */}
        <div aria-hidden className="absolute inset-0 backdrop-blur-md bg-slate-900/40" />

        <Logo size="md" tone="inverse" animated={false} className="relative" />

        <figure className="relative max-w-xl">
          <blockquote className="text-3xl xl:text-4xl font-semibold leading-snug tracking-tight text-white">
            &ldquo;Efficiency is doing things right; effectiveness is doing
            the right things.&rdquo;
          </blockquote>
          <figcaption className="mt-8">
            <span className="block text-lg font-bold text-white">Peter F. Drucker</span>
            <span className="block text-white/80">Management consultant, 1909&ndash;2005</span>
          </figcaption>
        </figure>
      </aside>

      {/* Right: sign-in */}
      <main className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <h1 className="sr-only">Sign in to BienSync</h1>
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo size="xl" href="/" />
            <p className="mt-8 text-2xl font-semibold tracking-tight text-slate-800">
              Welcome back
            </p>
            <p className="mt-1 text-slate-600">
              Sign in to manage your clinic, patients and appointments.
            </p>
          </div>

          <div>
            <LoginForm />
          </div>
        </div>
      </main>
    </div>
  );
}
