/*
<ai_context>
This client component provides the header for the app.
</ai_context>
*/

"use client"

import { signOutAction } from "@/app/(auth)/login/actions"
import { Logo } from "@/components/store/logo"
import { useUser } from "@/hooks/use-user"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"

interface HeaderProps {
  // Smaller header for the swipe screen, so the poster fits on a phone
  compact?: boolean
}

export default function Header({ compact = false }: HeaderProps) {
  const { user } = useUser()
  const [, startTransition] = useTransition()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const links = user
    ? [
        { href: "/sessions", label: "Sessions" },
        { href: "/settings", label: "Profile" }
      ]
    : [
        { href: "/login", label: "Log in" },
        { href: "/signup", label: "Sign up" }
      ]

  const signOut = () => {
    setIsMenuOpen(false)
    startTransition(() => signOutAction())
  }

  return (
    <header className="bg-store-navy sticky top-0 z-50">
      <div
        className={cn(
          "mx-auto flex max-w-screen-lg items-center justify-between px-4",
          compact ? "py-2" : "py-3"
        )}
      >
        <Logo
          href={user ? "/sessions" : "/"}
          className={compact ? "text-base" : undefined}
        />

        <nav className="hidden items-center gap-6 text-sm md:flex">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-store-yellow"
            >
              {link.label.toLowerCase()}
            </Link>
          ))}
          {user && (
            <button onClick={signOut} className="hover:text-store-yellow">
              sign out
            </button>
          )}
        </nav>

        <button
          className="flex size-11 items-center justify-center md:hidden"
          onClick={() => setIsMenuOpen(open => !open)}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {isMenuOpen && (
        <nav className="paper border-store-navy absolute inset-x-0 top-full border-b-4 md:hidden">
          <ul>
            {links.map(link => (
              <li
                key={link.href}
                className="border-b border-dotted border-neutral-400"
              >
                <Link
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="font-display block px-4 py-3"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {user && (
              <li>
                <button
                  onClick={signOut}
                  className="font-display block w-full px-4 py-3 text-left"
                >
                  Sign out
                </button>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  )
}
