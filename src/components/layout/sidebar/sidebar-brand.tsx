"use client";

import React from "react";
import { BrandConfig } from "@/types/navigation";
import { Logo } from "@/components/shared/Logo";

export function SidebarBrand({
  brand,
  className,
}: {
  brand: BrandConfig;
  className?: string;
}) {
  return (
    <Logo
      href={brand.href}
      bienText={brand.logoStart}
      syncText={brand.logoEnd}
      size="lg"
      animated={true}
      className={className}
    />
  );
}