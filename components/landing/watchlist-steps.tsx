import { Paper, PaperTitle } from "@/components/store/paper"

export function WatchlistSteps() {
  return (
    <section className="mx-auto max-w-screen-lg px-4">
      <Paper className="max-w-xl p-5 md:p-6">
        <PaperTitle className="text-base">New: watchlists</PaperTitle>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
          <li>Link Trakt or Letterboxd on your profile.</li>
          <li>In the lobby, the host picks whose lists to use.</li>
          <li>You swipe on movies people already wanted to see.</li>
        </ol>
      </Paper>
    </section>
  )
}
