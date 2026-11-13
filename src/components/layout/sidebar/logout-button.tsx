"use client";

import React from "react";
import { useFormStatus } from "react-dom";
import { logoutAction } from "@/actions/logout";
import { LogoutIcon } from "@/components/icons/nav-icons";
import { cn } from "@/lib/utils";

function LogoutSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "w-full flex items-center gap-3.5 px-3 py-2.5 rounded-md font-medium text-[15px] transition-all duration-150 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-400/40",
        "text-rose-600 dark:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-950/40",
        pending && "opacity-60 cursor-not-allowed"
      )}
    >
      <LogoutIcon className="w-5 h-5 shrink-0" />
      <span className="truncate">{pending ? "Signing out..." : "Log out"}</span>
    </button>
  );
}

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <LogoutSubmit />
    </form>
  );
}
