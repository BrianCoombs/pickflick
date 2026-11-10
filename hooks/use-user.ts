"use client"

import { authClient } from "@/lib/auth/client"

export function useUser() {
  const { data, isPending } = authClient.useSession()

  return { user: data?.user ?? null, loading: isPending }
}
