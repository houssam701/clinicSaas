import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Sign in | BienSync Clinic OS",
  description: "Secure doctor and staff portal for BienSync clinic management.",
};

/**
 * Server Component: BienSyncLogin Page
 * 
 * Renders the static layout, visual grid background, animated EKG line,
 * Medux-style branding header, and HIPAA security compliance badges on the server.
 * Only the interactive form fields & client state are delegated to LoginForm.
 */
export default function BienSyncLogin() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-bgColor font-sans overflow-hidden px-4 py-8">
      {/* Fallback Animation Keyframes if CSS layer is loading */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes pulse-heart {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
            @keyframes draw-ekg {
              0% { stroke-dashoffset: 1000; }
              100% { stroke-dashoffset: 0; }
            }
            .animate-pulse-heart { animation: pulse-heart 2s infinite ease-in-out; }
            .animate-draw-ekg {
              stroke-dasharray: 1000;
              animation: draw-ekg 4s linear infinite;
            }
          `,
        }}
      />

      {/* Dotted Grid Pattern Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Animated EKG Line (Server Rendered SVG with CSS animation) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
        <svg
          className="w-full h-48 text-slate-400"
          preserveAspectRatio="none"
          viewBox="0 0 1000 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            className="animate-draw-ekg"
            d="M0 50 H300 L320 50 L340 20 L360 80 L380 50 H600 L620 50 L640 20 L660 80 L680 50 H1000"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md p-8 sm:p-12 bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border-2 border-white">
        {/* Logo and Branding Header (Server Rendered) */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center gap-3 animate-pulse-heart-">
            {/* Medux-style Heart Logo */}
            {/* <svg
              width="48"
              height="48"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect
                x="12"
                y="16"
                width="24"
                height="36"
                rx="12"
                fill="#60a5fa"
                transform="rotate(-35 24 34)"
                style={{ mixBlendMode: "multiply" }}
              />
              <rect
                x="28"
                y="16"
                width="24"
                height="36"
                rx="12"
                fill="#2662f0"
                transform="rotate(35 40 34)"
                style={{ mixBlendMode: "multiply" }}
              />
            </svg>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-800">
              Bien<span className="text-primary">Sync</span>
            </h1> */}
            <Image alt="logo" src={'/assets/mainlogo.png'} width={350} height={350} />
          </div>
          <p className=" text-slate-500 font-medium text-sm sm:text-base">
            Sign in to your account
          </p>
        </div>

        {/* Client Component: Interactive Login Form with Reusable Button */}
        <LoginForm />

        {/* Security Badges (Server Rendered) */}
        <div className="mt-8 flex items-center justify-center gap-4 text-xs font-semibold text-slate-400 select-none">
          <div className="flex items-center gap-1.5">
            <svg
              className="w-4 h-4 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>HIPAA Compliant</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-300" aria-hidden="true" />
          <div className="flex items-center gap-1.5">
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
              />
            </svg>
            <span>256-bit Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
