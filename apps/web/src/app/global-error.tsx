"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="fr">
      <body>
        <main style={{ margin: "0 auto", maxWidth: 720, padding: "64px 24px" }}>
          <h1>Le service rencontre un problème.</h1>
          <p>
            Rechargez l'application. Si le problème persiste, contactez l'équipe
            avec l'heure de l'incident.
          </p>
          <button type="button" onClick={reset}>
            Recharger
          </button>
        </main>
      </body>
    </html>
  );
}
