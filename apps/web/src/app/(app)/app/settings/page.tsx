import { ProfileSettings } from "@/components/settings/profile-settings";
import { AppPageHeader } from "@/components/shell/app-page-header";

export default function SettingsPage() {
  return (
    <>
      <AppPageHeader
        description="Ajustez les informations de compte, les préférences et les accès personnels."
        eyebrow="Paramètres"
        title="Configuration du compte."
      />
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
