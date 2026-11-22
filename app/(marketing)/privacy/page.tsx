export const metadata = { title: "Privacy - PickFlick" }

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-4">
      <div className="paper space-y-6 p-5 shadow-[6px_6px_0_#000] sm:p-8">
        <h1 className="font-display text-3xl">Privacy</h1>
        <p className="text-sm text-neutral-600">
          Last updated November 21, 2026
        </p>

        <section className="space-y-2">
          <h2 className="font-display text-xl">What PickFlick stores</h2>
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
          <h2 className="font-display text-xl">How watchlists are used</h2>
          <p>
            When a session host builds the movie pool from watchlists, PickFlick
            reads the selected Trakt and Letterboxd watchlists at that moment.
            We only read them; we never change anything on Trakt or Letterboxd.
            We don&apos;t store the contents of your watchlist, only the movies
            picked for that session&apos;s pool. Other people in the session can
            see your name and which services you&apos;ve linked.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-xl">Disconnecting</h2>
          <p>
            Disconnect Trakt or remove Letterboxd at any time on your profile
            page. Disconnecting Trakt deletes the stored tokens and revokes them
            with Trakt.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-xl">Sharing</h2>
          <p>
            We don&apos;t sell or share your data. Movie details come from TMDb.
          </p>
        </section>

        <p className="border-t pt-6 text-sm text-neutral-600">
          PickFlick uses Trakt but is not endorsed or certified by Trakt. This
          product uses the TMDb API but is not endorsed or certified by TMDb.
        </p>
      </div>
    </div>
  )
}
