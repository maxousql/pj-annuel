export type TransactionalEmailDetail = {
  label: string;
  value: string;
};

export type TransactionalEmailDocument = {
  action: {
    label: string;
    url: string;
  };
  details: readonly TransactionalEmailDetail[];
  eyebrow: string;
  footer: string;
  paragraphs: readonly string[];
  preheader: string;
  subject: string;
  title: string;
};

export type RenderedTransactionalEmail = {
  html: string;
  subject: string;
  text: string;
};

const BRAND = {
  card: "#FFFDF7",
  ink: "#17130F",
  mutedInk: "#5D564A",
  paper: "#F6F1E7",
  vermilion: "#D8401F",
} as const;

export function renderTransactionalEmail(
  document: TransactionalEmailDocument,
): RenderedTransactionalEmail {
  const actionUrl = requireHttpUrl(document.action.url);
  const subject = normalizeHeaderText(document.subject);

  return {
    html: renderHtml(document, actionUrl, subject),
    subject,
    text: renderText(document, actionUrl),
  };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtml(
  document: TransactionalEmailDocument,
  actionUrl: string,
  subject: string,
): string {
  const details = document.details
    .map(
      ({ label, value }) => `
                        <tr>
                          <td style="padding: 0 12px 10px 0; color: ${BRAND.mutedInk}; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 20px; vertical-align: top; white-space: nowrap;">${escapeHtml(label)}</td>
                          <td style="padding: 0 0 10px; color: ${BRAND.ink}; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700; line-height: 20px; overflow-wrap: anywhere; word-break: break-word; vertical-align: top;">${escapeHtml(value)}</td>
                        </tr>`,
    )
    .join("");
  const paragraphs = document.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin: 0 0 18px; color: ${BRAND.ink}; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 26px; overflow-wrap: anywhere; word-break: break-word;">${escapeHtml(paragraph)}</p>`,
    )
    .join("\n                    ");
  const escapedActionUrl = escapeHtml(actionUrl);

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: ${BRAND.paper}; color: ${BRAND.ink};">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent; line-height: 1px; mso-hide: all;">${escapeHtml(document.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: ${BRAND.paper}; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 24px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 620px; border-collapse: collapse;">
            <tr>
              <td style="padding: 0 4px 18px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td aria-hidden="true" style="width: 34px; height: 34px; border: 2px solid ${BRAND.ink}; border-radius: 50%; color: ${BRAND.vermilion}; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 700; line-height: 34px; text-align: center; vertical-align: middle;">*</td>
                    <td style="padding-left: 12px; color: ${BRAND.ink}; font-family: Georgia, 'Times New Roman', serif; font-size: 25px; font-weight: 700; letter-spacing: -0.3px; line-height: 32px;">Content AI<span style="color: ${BRAND.vermilion};">.</span></td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="border-top: 4px solid ${BRAND.ink}; background-color: ${BRAND.card};">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 34px 32px 14px;">
                      <p style="margin: 0 0 12px; color: ${BRAND.vermilion}; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 1.4px; line-height: 18px; text-transform: uppercase;">${escapeHtml(document.eyebrow)}</p>
                      <h1 style="margin: 0; color: ${BRAND.ink}; font-family: Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; line-height: 40px; overflow-wrap: anywhere; word-break: break-word;">${escapeHtml(document.title)}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 18px 32px 8px;">
                      ${paragraphs}
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 4px 0 24px; border-collapse: collapse; border-top: 1px solid #D8D0C2; border-bottom: 1px solid #D8D0C2;">
                        <tr>
                          <td style="padding: 18px 0 8px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">${details}
                            </table>
                          </td>
                        </tr>
                      </table>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                        <tr>
                          <td bgcolor="${BRAND.ink}" style="background-color: ${BRAND.ink}; border-left: 4px solid ${BRAND.vermilion};">
                            <a href="${escapedActionUrl}" style="display: inline-block; min-height: 20px; padding: 14px 22px; color: ${BRAND.card}; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 700; line-height: 20px; text-decoration: none;">${escapeHtml(document.action.label)}</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 32px 34px;">
                      <p style="margin: 0 0 8px; color: ${BRAND.mutedInk}; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 20px;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
                      <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 20px; overflow-wrap: anywhere; word-break: break-all;"><a href="${escapedActionUrl}" style="color: ${BRAND.vermilion}; text-decoration: underline;">${escapedActionUrl}</a></p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 18px 4px 0; color: ${BRAND.mutedInk}; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 18px;">${escapeHtml(document.footer)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderText(
  document: TransactionalEmailDocument,
  actionUrl: string,
): string {
  const details = document.details
    .map(
      ({ label, value }) =>
        `${normalizePlainText(label)} : ${normalizePlainText(value)}`,
    )
    .join("\n");

  return [
    "Content AI.",
    normalizePlainText(document.eyebrow).toUpperCase(),
    normalizePlainText(document.title),
    ...document.paragraphs.map(normalizePlainText),
    details,
    normalizePlainText(document.action.label),
    actionUrl,
    "Si le bouton ne fonctionne pas, copiez le lien complet ci-dessus dans votre navigateur.",
    normalizePlainText(document.footer),
  ]
    .filter((part) => part.length > 0)
    .join("\n\n");
}

function normalizeHeaderText(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizePlainText(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function requireHttpUrl(value: string): string {
  const candidate = value.trim();
  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Transactional email action URL must be valid.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Transactional email action URL must use HTTP or HTTPS.");
  }

  return url.href;
}
