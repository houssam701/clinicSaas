"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { apiUrl, parseSetCookie } from "@/lib/api";

export type LoginState = {
  error?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
};

function isInternalPath(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

/**
 * Server Action: loginAction
 *
 * Called by the LoginForm via useActionState.
 * Reads FormData, posts credentials to /api/auth/login,
 * forwards any Set-Cookie headers returned by the API route to the browser,
 * and either redirects on success or returns structured error state.
 */
export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  let response: Response;
  try {
    response = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { error: "Network error — please try again." };
  }

  // 1. If login succeeded, forward the auth cookies from the API response to the browser
  if (response.ok) {
    const cookieStore = await cookies();
    const setCookies =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : response.headers.get("set-cookie")
        ? [response.headers.get("set-cookie")!]
        : [];

    for (const cookieHeader of setCookies) {
      if (!cookieHeader) continue;
      const { name, value, options } = parseSetCookie(cookieHeader);
      if (name) {
        cookieStore.set(name, value, options);
      }
    }

    // "/" resolves to the signed-in user's role home if no target was returned
    const { redirectTo } = await response
      .json()
      .catch(() => ({ redirectTo: undefined }));
    redirect(isInternalPath(redirectTo) ? redirectTo : "/");
  }

  // 2. Parse error response
  let data: { error?: string; details?: unknown };
  try {
    data = await response.json();
  } catch {
    return { error: "Unexpected server error." };
  }

  if (response.status === 400) {
    const details = data.details as
      | { fieldErrors?: { email?: string[]; password?: string[] } }
      | undefined;
    return {
      error: "Please check the highlighted fields.",
      fieldErrors: details?.fieldErrors,
    };
  }

  if (response.status === 401) {
    return { error: data.error ?? "Invalid email or password." };
  }

  return { error: "Something went wrong. Please try again." };
}