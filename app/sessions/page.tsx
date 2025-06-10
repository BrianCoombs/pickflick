import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Film, Plus, Users } from "lucide-react"
import Link from "next/link"
import { getActiveSessions } from "@/actions/db/movies-actions"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function SessionsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/login")
  }

  const sessionsResult = await getActiveSessions()
  const activeSessions = sessionsResult.success ? sessionsResult.data : []

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Movie Sessions</h1>
        <p className="text-muted-foreground">
          Start swiping with friends to find your perfect movie
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-5" />
              New Session
            </CardTitle>
            <CardDescription>
              Create a new movie session and invite friends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/sessions/new">
              <Button className="w-full">
                <Film className="mr-2 size-4" />
                Create Session
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Join Session
            </CardTitle>
            <CardDescription>
              Join an existing session with a code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/sessions/join">
              <Button variant="outline" className="w-full">
                Enter Code
              </Button>
            </Link>
          </CardContent>
        </Card>

        {activeSessions.map((session: any) => (
          <Card key={session.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="size-5" />
                Active Session
              </CardTitle>
              <CardDescription>
                {session.userIds.length} participants • Created{" "}
                {new Date(session.createdAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/sessions/${session.id}`}>
                <Button className="w-full">Continue Swiping</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
