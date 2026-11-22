/*
<ai_context>
This server page is the marketing homepage.
</ai_context>
*/

import { HeroSection } from "@/components/landing/hero"
import { WatchlistSteps } from "@/components/landing/watchlist-steps"

export default function HomePage() {
  return (
    <div className="pb-20">
      <HeroSection />
      <WatchlistSteps />
    </div>
  )
}
