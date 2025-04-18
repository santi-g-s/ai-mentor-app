"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import { MobileNav } from "./mobile-nav"

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto">
      <main className="flex-1 p-4 pb-20">{children}</main>
      <MobileNav currentPath={pathname} />
    </div>
  )
}
