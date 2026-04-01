/*
<ai_context>
This client component provides a user button for the sidebar using Supabase Auth.
</ai_context>
*/

"use client"

import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useUser } from "@/hooks/use-user"
import { signOutAction } from "@/app/(auth)/login/actions"
import { LogOut, User } from "lucide-react"

export function NavUser() {
  const { user } = useUser()

  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex items-center gap-2 font-medium">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2">
            <User className="size-5" />
            <span className="truncate">{user?.email}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => signOutAction()}
              className="cursor-pointer"
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
