"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { HiOutlineEye, HiOutlineEyeSlash, HiOutlineLockClosed } from "react-icons/hi2";
import type { ResetPasswordState } from "@/lib/password-form";
import { FormAlert } from "@/components/ui/form-field";
import { AuthField, AuthSubmit } from "@/components/auth/auth-fields";
import { PATHS } from "@/config/path";

/**
 * New password, twice, from a reset link. `action` is resetPasswordAction
 * bound to the link's token; on success it goes to the login page.
 */
export function ResetPasswordForm({ action }: { action: (state: ResetPasswordState, formData: FormData) => Promise<ResetPasswordState> }) {
  const [values, setValues] = useState({ new_password: "", confirm_password: "" });
  const [show, setShow] = useState(false);
  const [state, formAction] = useActionState(action, {});

  if (state.expired) {
    return (
      <div role="alert" className="space-y-4 rounded-md border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="font-bold text-amber-900">This link no longer works</p>
        <p className="text-sm text-amber-800">{state.error}</p>
        <Link href={PATHS.forgotPassword} className="inline-block text-sm font-bold text-primary hover:text-blue-700">
          Ask for a new link
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-5">
      <FormAlert>{state.error}</FormAlert>
      <AuthField
        id="new_password"
        label="New password"
        icon={HiOutlineLockClosed}
        type={show ? "text" : "password"}
        autoComplete="new-password"
        required
        value={values.new_password}
        onChange={(e) => setValues((v) => ({ ...v, new_password: e.target.value }))}
        hint="At least 8 characters."
        error={state.fieldErrors?.new_password?.[0]}
      />
      <AuthField
        id="confirm_password"
        label="Confirm new password"
        icon={HiOutlineLockClosed}
        type={show ? "text" : "password"}
        autoComplete="new-password"
        required
        value={values.confirm_password}
        onChange={(e) => setValues((v) => ({ ...v, confirm_password: e.target.value }))}
        error={state.fieldErrors?.confirm_password?.[0]}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-pressed={show}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-primary"
      >
        {show ? <HiOutlineEyeSlash aria-hidden="true" className="h-4 w-4" /> : <HiOutlineEye aria-hidden="true" className="h-4 w-4" />}
        {show ? "Hide passwords" : "Show passwords"}
      </button>
      <p className="text-xs text-slate-500">You will be signed out on every device, then sign in with the new password.</p>
      <AuthSubmit label="Set new password" pendingLabel="Saving..." />
    </form>
  );
}
