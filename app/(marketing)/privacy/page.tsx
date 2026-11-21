export const metadata = { title: "Privacy - PickFlick" }

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-2xl space-y-6 py-12">
      <h1 className="text-3xl font-bold">Privacy</h1>
      <p className="text-muted-foreground text-sm">
        Last updated November 21, 2026
      </p>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">What PickFlick stores</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Your account: name, email and sign-in details.</li>
          <li>Movie sessions you create or join, and your swipes in them.</li>
          <li>
            If you connect Trakt: your Trakt username and the access tokens
            Trakt gives us, so we can read your watchlist.
          </li>
          <li>If you link Letterboxd: your Letterboxd username.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">How watchlists are used</h2>
        <p>
          When a session host builds the movie pool from watchlists, PickFlick
          reads the selected Trakt and Letterboxd watchlists at that moment. We
          only read them; we never change anything on Trakt or Letterboxd. We
          don&apos;t store the contents of your watchlist, only the movies
          picked for that session&apos;s pool. Other people in the session can
          see your name and which services you&apos;ve linked.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Disconnecting</h2>
        <p>
          Disconnect Trakt or remove Letterboxd at any time on your profile
          page. Disconnecting Trakt deletes the stored tokens and revokes them
          with Trakt.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Sharing</h2>
        <p>
          We don&apos;t sell or share your data. Movie details come from TMDb.
        </p>
      </section>

      <p className="text-muted-foreground border-t pt-6 text-sm">
        PickFlick uses Trakt but is not endorsed or certified by Trakt. This
        product uses the TMDb API but is not endorsed or certified by TMDb.
      </p>
    </div>
  )
}
