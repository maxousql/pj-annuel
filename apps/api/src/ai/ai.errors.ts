import { HttpException, HttpStatus } from "@nestjs/common";
import type { AiGenerationErrorCode } from "@content-ai/shared";

const AI_ERROR_STATUS: Record<AiGenerationErrorCode, HttpStatus> = {
  AI_INVALID_OUTPUT: HttpStatus.BAD_GATEWAY,
  AI_PROVIDER_ERROR: HttpStatus.BAD_GATEWAY,
  AI_QUOTA_EXCEEDED: HttpStatus.TOO_MANY_REQUESTS,
  AI_TIMEOUT: HttpStatus.GATEWAY_TIMEOUT,
};

const AI_ERROR_MESSAGES: Record<AiGenerationErrorCode, string> = {
  AI_INVALID_OUTPUT: "La reponse IA est inexploitable.",
  AI_PROVIDER_ERROR: "Le fournisseur IA est indisponible.",
  AI_QUOTA_EXCEEDED: "Le quota du fournisseur IA est atteint.",
  AI_TIMEOUT: "Le fournisseur IA n'a pas repondu a temps.",
};

export class AiGenerationException extends HttpException {
  readonly code: AiGenerationErrorCode;

  constructor(code: AiGenerationErrorCode, message = AI_ERROR_MESSAGES[code]) {
    super({ code, message }, AI_ERROR_STATUS[code] ?? HttpStatus.BAD_GATEWAY);
    this.code = code;
  }
}

export function toAiGenerationException(error: unknown): AiGenerationException {
  if (error instanceof AiGenerationException) {
    return error;
  }

  return new AiGenerationException("AI_PROVIDER_ERROR");
}
