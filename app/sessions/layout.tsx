import { SessionsHeader } from "./_components/sessions-header"

export default function SessionsLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SessionsHeader />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  )
}
