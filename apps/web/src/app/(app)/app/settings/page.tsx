import { ProfileSettings } from "@/components/settings/profile-settings";

export default function SettingsPage() {
  return (
    <>
      <section className="app-title">
        <p className="eyebrow">Paramètres</p>
        <h1>Configuration du compte.</h1>
        <p>
          Ajustez les informations de compte, les préférences et les accès
          personnels.
        </p>
      </section>
      <section className="settings-grid" aria-label="Sections de paramètres">
        <article className="settings-panel">
          <header>
            <div>
              <p className="eyebrow">Profil</p>
              <h2>Identité utilisateur</h2>
            </div>
          </header>
          <p className="muted">
            Informations publiques et préférences personnelles.
          </p>
          <ProfileSettings />
        </article>
        <article className="settings-panel">
          <header>
            <div>
              <p className="eyebrow">Sécurité</p>
              <h2>Session et accès</h2>
            </div>
          </header>
          <p className="muted">Gestion de session et vérification des accès.</p>
        </article>
      </section>
    </>
  );
}
