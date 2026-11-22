/*
<ai_context>
This server layout provides the header and a centered layout for (auth) pages.
</ai_context>
*/

import Header from "@/components/header"

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        {children}
      </main>
    </div>
  )
}
