import { ProfileSettings } from "@/components/settings/profile-settings";

export default function SettingsPage() {
  return (
    <>
      <section className="app-title">
        <p className="eyebrow">Parametres</p>
        <h1>Configuration du compte.</h1>
        <p>
          Ajustez les informations de compte, les preferences et les acces
          personnels.
        </p>
      </section>
      <section className="settings-grid" aria-label="Sections de parametres">
        <article className="settings-panel">
          <header>
            <div>
              <p className="eyebrow">Profil</p>
              <h2>Identite utilisateur</h2>
            </div>
          </header>
          <p className="muted">
            Informations publiques et preferences personnelles.
          </p>
          <ProfileSettings />
        </article>
        <article className="settings-panel">
          <header>
            <div>
              <p className="eyebrow">Securite</p>
              <h2>Session et acces</h2>
            </div>
          </header>
          <p className="muted">Gestion de session et verification des acces.</p>
        </article>
      </section>
    </>
  );
}
