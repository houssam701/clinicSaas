"use client";

import { HiOutlinePrinter } from "react-icons/hi2";

/** Opens the browser's print dialog; hidden on the printed page itself. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold text-white bg-primary hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 transition-colors"
    >
      <HiOutlinePrinter aria-hidden="true" className="h-4 w-4" />
      Print receipt
    </button>
  );
}
