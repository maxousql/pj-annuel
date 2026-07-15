import {
  type RenderedTransactionalEmail,
  renderTransactionalEmail,
} from "../common/email/transactional-email";

export type InvitationEmailInput = {
  email: string;
  expiresAt: Date;
  invitationUrl: string;
  inviterName: string;
  organizationName: string;
  role: string;
};

const ROLE_LABELS: Readonly<Record<string, string>> = {
  ADMIN: "Administrateur",
  EDITOR: "Éditeur",
  READER: "Lecteur",
};

export function renderInvitationEmail(
  input: InvitationEmailInput,
): RenderedTransactionalEmail {
  const expiration = formatExpiration(input.expiresAt);
  const role = localizeRole(input.role);

  return renderTransactionalEmail({
    action: {
      label: "Accepter l’invitation",
      url: input.invitationUrl,
    },
    details: [
      { label: "Organisation", value: input.organizationName },
      { label: "Invité par", value: input.inviterName },
      { label: "Rôle proposé", value: role },
      { label: "Expiration", value: expiration },
    ],
    eyebrow: "Invitation à collaborer",
    footer:
      "Vous recevez ce message parce qu’une invitation Content AI a été créée pour votre adresse. Si vous ne l’attendiez pas, vous pouvez l’ignorer.",
    paragraphs: [
      `${input.inviterName} vous invite à rejoindre ${input.organizationName} sur Content AI.`,
      `En acceptant, vous rejoindrez l’espace avec le rôle « ${role} ». Ce lien est valable jusqu’au ${expiration}.`,
    ],
    preheader: `${input.inviterName} vous invite à rejoindre ${input.organizationName} sur Content AI.`,
    subject: `${input.inviterName} vous invite à rejoindre ${input.organizationName} sur Content AI`,
    title: `Rejoignez ${input.organizationName}`,
  });
}

export function localizeRole(role: string): string {
  const normalized = role.trim();
  return ROLE_LABELS[normalized.toUpperCase()] ?? (normalized || "Non précisé");
}

export function formatExpiration(expiresAt: Date): string {
  if (!Number.isFinite(expiresAt.getTime())) {
    throw new RangeError("Invitation expiration date must be valid.");
  }

  const formatted = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(expiresAt);

  return `${formatted} (UTC)`;
}
