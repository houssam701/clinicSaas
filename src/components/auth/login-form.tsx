"use client";

import React, { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/actions/login";
import {
  HiOutlineAtSymbol,
  HiOutlineExclamationTriangle,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineLockClosed,
} from "react-icons/hi2";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Submit button — reads pending state from the closest <form> via useFormStatus
// ---------------------------------------------------------------------------
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      size="lg"
      fullWidth
      isLoading={pending}
      loadingText="Signing in..."
      aria-disabled={pending}
    >
      Sign in
    </Button>
  );
}

// ---------------------------------------------------------------------------
// LoginForm
// ---------------------------------------------------------------------------
const initialState: LoginState = {};

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  // Controlled so React 19 does not clear the fields after a failed attempt
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {/* Top-level error banner */}
      {state.error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
        >
          <HiOutlineExclamationTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      {/* Email Address */}
      <div>
        <label
          className="block text-sm font-bold text-slate-700 mb-2"
          htmlFor="email"
        >
          Email Address
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <HiOutlineAtSymbol aria-hidden="true" className="h-5 w-5" />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-describedby={
              state.fieldErrors?.email ? "email-error" : undefined
            }
            className={`block w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm sm:text-base ${
              state.fieldErrors?.email
                ? "border-red-400 focus:ring-red-200"
                : "border-slate-200"
            }`}
            placeholder="name@example.com"
          />
        </div>
        {state.fieldErrors?.email && (
          <p id="email-error" className="mt-1.5 text-xs text-red-500 font-medium">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            className="block text-sm font-bold text-slate-700"
            htmlFor="password"
          >
            Password
          </label>
          {/* No self-service reset yet: tell users who can help instead of a dead link */}
          <span className="text-xs text-slate-500">
            Forgot it? Ask your clinic admin.
          </span>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <HiOutlineLockClosed aria-hidden="true" className="h-5 w-5" />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-describedby={
              state.fieldErrors?.password ? "password-error" : undefined
            }
            className={`block w-full pl-11 pr-11 py-3 bg-slate-50 border rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm sm:text-base ${
              state.fieldErrors?.password
                ? "border-red-400 focus:ring-red-200"
                : "border-slate-200"
            }`}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <HiOutlineEyeSlash aria-hidden="true" className="h-5 w-5" />
            ) : (
              <HiOutlineEye aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        </div>
        {state.fieldErrors?.password && (
          <p
            id="password-error"
            className="mt-1.5 text-xs text-red-500 font-medium"
          >
            {state.fieldErrors.password[0]}
          </p>
        )}
      </div>

      {/* Submit */}
      <SubmitButton />
    </form>
  );
}

