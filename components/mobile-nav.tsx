"use client"

import Link from "next/link"
import { BarChart2, Mic } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileNavProps {
  currentPath: string
}

export function MobileNav({ currentPath }: MobileNavProps) {
  const navItems = [
    {
      href: "/",
      icon: Mic,
      label: "Session",
    },
    {
      href: "/dashboard",
      icon: BarChart2,
      label: "Dashboard",
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="max-w-md mx-auto">
        <nav className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = currentPath === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full text-sm transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="h-5 w-5 mb-1" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
