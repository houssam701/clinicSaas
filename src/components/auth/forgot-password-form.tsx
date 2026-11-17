"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { HiArrowLeft, HiOutlineAtSymbol, HiOutlineEnvelopeOpen } from "react-icons/hi2";
import { requestPasswordResetAction } from "@/actions/request-password-reset";
import type { ForgotPasswordState } from "@/lib/password-form";
import { FormAlert } from "@/components/ui/form-field";
import { AuthField, AuthSubmit } from "@/components/auth/auth-fields";
import { PATHS } from "@/config/path";
import { RESET_LINK_MINUTES } from "@/config/auth-limits";

const backToLogin = (
  <Link
    href={PATHS.login}
    className="group inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-blue-700 focus:outline-none focus-visible:underline"
  >
    <HiArrowLeft aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
    Back to sign in
  </Link>
);

/**
 * Email form for a reset link. After sending, it shows "check your email"
 * (the same whether or not the email has an account).
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [state, formAction] = useActionState<ForgotPasswordState, FormData>(requestPasswordResetAction, {});

  if (state.sent) {
    return (
      <div className="space-y-6 text-center">
        <div role="status" className="rounded-md border border-slate-200 bg-white p-6">
          <HiOutlineEnvelopeOpen aria-hidden="true" className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-3 font-bold text-slate-800">Check your email</p>
          <p className="mt-1 text-sm text-slate-600">
            If an account uses <strong className="break-all font-semibold text-slate-800">{email}</strong>, we sent it a link to choose a new
            password. The link works for {RESET_LINK_MINUTES} minutes.
          </p>
          <p className="mt-3 text-xs text-slate-500">Nothing after a few minutes? Check your spam folder, or ask your clinic admin.</p>
        </div>
        {backToLogin}
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-5">
      <FormAlert>{state.error}</FormAlert>
      <AuthField
        id="email"
        label="Email address"
        icon={HiOutlineAtSymbol}
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="name@example.com"
        error={state.fieldErrors?.email?.[0]}
      />
      <AuthSubmit label="Send reset link" pendingLabel="Sending..." />
      <div className="text-center">{backToLogin}</div>
    </form>
  );
}
