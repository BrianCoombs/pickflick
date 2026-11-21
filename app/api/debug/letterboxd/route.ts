// Throwaway: checks whether Letterboxd serves pages to Vercel's servers.
import { NextResponse } from "next/server"

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"

export async function GET() {
  const check = async (url: string, pattern: RegExp) => {
    const res = await fetch(url, { headers: { "User-Agent": UA } })
    const html = await res.text()
    return {
      url,
      status: res.status,
      matched: pattern.test(html),
      challenged: /Just a moment|cf-chl/.test(html)
    }
  }
  const results = await Promise.all([
    check("https://letterboxd.com/dave/watchlist/", /data-item-slug=/),
    check("https://letterboxd.com/film/parasite-2019/", /data-tmdb-id="496243"/)
  ])
  return NextResponse.json(results)
}
