export const PUBLIC_HONEYPOT_FIELD_NAME = "website";
export const PUBLIC_FORM_STARTED_FIELD_NAME = "formStartedAt";

const MIN_PUBLIC_FORM_FILL_MS = 2500;

function readValue(source: FormData | Record<string, unknown>, key: string) {
  if (source instanceof FormData) {
    const value = source.get(key);
    return typeof value === "string" ? value : "";
  }

  const value = source[key];
  return typeof value === "string" ? value : "";
}

export function assertPublicSubmissionGuard(source: FormData | Record<string, unknown>) {
  const honeypot = readValue(source, PUBLIC_HONEYPOT_FIELD_NAME).trim();
  if (honeypot) {
    throw new Error("spam_detected");
  }

  const startedAtRaw = readValue(source, PUBLIC_FORM_STARTED_FIELD_NAME).trim();
  if (!startedAtRaw) {
    return;
  }

  const startedAt = Number(startedAtRaw);
  if (!Number.isFinite(startedAt)) {
    return;
  }

  if (Date.now() - startedAt < MIN_PUBLIC_FORM_FILL_MS) {
    throw new Error("submission_too_fast");
  }
}
