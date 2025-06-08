/*
<ai_context>
This client component provides the sidebar for the app.
</ai_context>
*/

"use client"

import {
  Film,
  Users,
  Heart,
  History,
  Settings,
  Sparkles,
  Play,
  UserPlus
} from "lucide-react"
import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from "@/components/ui/sidebar"
import { NavMain } from "./nav-main"
import { NavProjects } from "./nav-projects"
import { NavUser } from "./nav-user"
import { TeamSwitcher } from "./team-switcher"

// Sample data
const data = {
  user: {
    name: "Movie Lover",
    email: "user@pickflick.app",
    avatar: "/avatars/user.jpg"
  },
  teams: [
    {
      name: "PickFlick",
      logo: Film,
      plan: "Premium"
    }
  ],
  navMain: [
    {
      title: "Sessions",
      url: "/sessions",
      icon: Play,
      isActive: true,
      items: [
        { title: "New Session", url: "/sessions/new" },
        { title: "Active Sessions", url: "/sessions/active" },
        { title: "Join Session", url: "/sessions/join" }
      ]
    },
    {
      title: "Friends",
      url: "/friends",
      icon: Users,
      items: [
        { title: "My Friends", url: "/friends" },
        { title: "Add Friends", url: "/friends/add" },
        { title: "Friend Requests", url: "/friends/requests" }
      ]
    },
    {
      title: "Movies",
      url: "/movies",
      icon: Film,
      items: [
        { title: "Discover", url: "/movies/discover" },
        { title: "My Watchlist", url: "/movies/watchlist" },
        { title: "Liked Movies", url: "/movies/liked" }
      ]
    },
    {
      title: "History",
      url: "/history",
      icon: History,
      items: [
        { title: "Recent Matches", url: "/history/matches" },
        { title: "Watch History", url: "/history/watched" },
        { title: "Session History", url: "/history/sessions" }
      ]
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      items: [
        { title: "Profile", url: "/settings/profile" },
        { title: "Preferences", url: "/settings/preferences" },
        { title: "Connected Apps", url: "/settings/apps" }
      ]
    }
  ],
  projects: [
    { name: "Weekend Movie Night", url: "#", icon: Sparkles },
    { name: "Date Night Picks", url: "#", icon: Heart },
    { name: "Friends Group", url: "#", icon: UserPlus }
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
