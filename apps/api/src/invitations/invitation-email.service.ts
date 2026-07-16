import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import {
  type InvitationEmailInput,
  renderInvitationEmail,
} from "./invitation-email.template";

const DELIVERY_ERROR_MESSAGE = "L'email d'invitation n'a pas pu être envoyé.";
const CONFIGURATION_ERROR_MESSAGE =
  "Le service d'envoi d'invitations n'est pas configuré.";

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

  async sendInvitation(input: InvitationEmailInput): Promise<void> {
    if (this.provider === "console" && process.env.NODE_ENV !== "production") {
      this.logger.log(
        `Invitation prepared for ${maskEmail(input.email)} (${safeLogLabel(input.organizationName)}).`,
      );
      return;
    }

    if (this.provider !== "resend" || !this.resendApiKey) {
      throw new ServiceUnavailableException(CONFIGURATION_ERROR_MESSAGE);
    }

    const email = renderInvitationEmail(input);
    let response: Response;

    try {
      response = await fetch("https://api.resend.com/emails", {
        body: JSON.stringify({
          from: this.from,
          html: email.html,
          subject: email.subject,
          text: email.text,
          to: [input.email],
        }),
        headers: {
          authorization: `Bearer ${this.resendApiKey}`,
          "content-type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      this.logger.error(
        `Resend invitation email request failed (${classifyFetchFailure(error)}).`,
      );
      throw new ServiceUnavailableException(DELIVERY_ERROR_MESSAGE);
    }

    if (!response.ok) {
      this.logger.error(
        `Resend invitation email rejected (status=${response.status}).`,
      );
      throw new ServiceUnavailableException(DELIVERY_ERROR_MESSAGE);
    }
  }
}

function classifyFetchFailure(error: unknown): "network" | "timeout" {
  return error instanceof Error &&
    ["AbortError", "TimeoutError"].includes(error.name)
    ? "timeout"
    : "network";
}

function maskEmail(email: string): string {
  const [localPart = "", domain = ""] = email.split("@");
  return `${localPart.slice(0, 1)}***@${domain}`;
}

function safeLogLabel(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}
