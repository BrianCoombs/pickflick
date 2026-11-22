"use client"

import Header from "@/components/header"
import { usePathname } from "next/navigation"

// The lobby and swipe screen (/sessions/<id>) get the compact header so the
// poster and buttons fit on a phone
export function SessionsHeader() {
  const pathname = usePathname()
  const inSession = /^\/sessions\/[0-9a-f-]{36}$/.test(pathname)
  return <Header compact={inSession} />
}
