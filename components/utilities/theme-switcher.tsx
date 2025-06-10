/*
<ai_context>
This client component provides a theme switcher for the app.
</ai_context>
*/

"use client"

import { cn } from "@/lib/utils"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { HTMLAttributes, ReactNode, useEffect, useState } from "react"

interface ThemeSwitcherProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

export const ThemeSwitcher = ({ children, ...props }: ThemeSwitcherProps) => {
  const [mounted, setMounted] = useState(false)
  const { setTheme, theme } = useTheme()

  // Only run on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleChange = (theme: "dark" | "light") => {
    localStorage.setItem("theme", theme)
    setTheme(theme)
  }

  // Show a placeholder div during SSR to prevent layout shift
  if (!mounted) {
    return (
      <div
        className={cn(
          "p-1 hover:cursor-pointer hover:opacity-50",
          props.className
        )}
      >
        <div className="size-6" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "p-1 hover:cursor-pointer hover:opacity-50",
        props.className
      )}
      onClick={() => handleChange(theme === "light" ? "dark" : "light")}
    >
      {theme === "dark" ? (
        <Moon className="size-6" />
      ) : (
        <Sun className="size-6" />
      )}
    </div>
  )
}
