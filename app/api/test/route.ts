import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "PickFlick API is running!",
    timestamp: new Date().toISOString(),
    environment: {
      hasSupabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasTMDb: !!process.env.TMDB_API_KEY,
      hasDatabase: !!process.env.DATABASE_URL
    }
  })
}
