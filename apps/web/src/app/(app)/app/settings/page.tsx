import { ProfileSettings } from "@/components/settings/profile-settings";
import { AppPageHeader } from "@/components/shell/app-page-header";

export default function SettingsPage() {
  return (
    <>
      <AppPageHeader
        description="Retrouvez votre activité, vos accès et les informations qui vous représentent dans Content AI."
        eyebrow="Compte personnel"
        title="Votre espace, à votre image."
      />
      <ProfileSettings />
    </>
  );
}
