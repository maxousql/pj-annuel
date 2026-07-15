import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class InvitationEmailService {
  private readonly logger = new Logger(InvitationEmailService.name);
  private readonly provider: string;
  private readonly resendApiKey: string;
  private readonly from: string;

  constructor(configService: ConfigService) {
    this.provider =
      configService.get<string>("INVITATION_EMAIL_PROVIDER") ?? "console";
    this.resendApiKey = configService.get<string>("RESEND_API_KEY") ?? "";
    this.from =
      configService.get<string>("INVITATION_EMAIL_FROM") ??
      "Content AI <noreply@example.invalid>";
  }

  async sendInvitation(input: {
    email: string;
    expiresAt: Date;
    invitationUrl: string;
    inviterName: string;
    organizationName: string;
    role: string;
  }): Promise<void> {
    if (this.provider === "console" && process.env.NODE_ENV !== "production") {
      this.logger.log(
        `Invitation prepared for ${maskEmail(input.email)} (${input.organizationName}).`,
      );
      return;
    }

    if (this.provider !== "resend" || !this.resendApiKey) {
      throw new ServiceUnavailableException(
        "Le service d'envoi d'invitations n'est pas configuré.",
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      body: JSON.stringify({
        from: this.from,
        html: buildInvitationHtml(input),
        subject: `${input.inviterName} vous invite sur Content AI`,
        to: [input.email],
      }),
      headers: {
        authorization: `Bearer ${this.resendApiKey}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "No response body");
      this.logger.error(
        `Resend API error: ${response.status} ${response.statusText} - ${error}`,
      );
      throw new ServiceUnavailableException(
        "L'email d'invitation n'a pas pu etre envoye.",
      );
    }
  }
}

function buildInvitationHtml(input: {
  expiresAt: Date;
  invitationUrl: string;
  inviterName: string;
  organizationName: string;
  role: string;
}): string {
  return `
    <p>${escapeHtml(input.inviterName)} vous invite a rejoindre <strong>${escapeHtml(
      input.organizationName,
    )}</strong> sur Content AI.</p>
    <p>Role propose : ${escapeHtml(input.role)}.</p>
    <p><a href="${escapeHtml(input.invitationUrl)}">Accepter l'invitation</a></p>
    <p>Ce lien expire le ${escapeHtml(input.expiresAt.toISOString())}.</p>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function maskEmail(email: string): string {
  const [localPart = "", domain = ""] = email.split("@");
  return `${localPart.slice(0, 1)}***@${domain}`;
}
