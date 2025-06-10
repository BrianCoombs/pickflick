import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "PickFlick API is running!",
    timestamp: new Date().toISOString(),
    environment: {
      hasClerk: !!process.env.CLERK_SECRET_KEY,
      hasTMDb: !!process.env.TMDB_API_KEY,
      hasDatabase: !!process.env.DATABASE_URL
    }
  })
}
