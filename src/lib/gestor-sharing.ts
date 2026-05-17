export function joinShareLines(lines: Array<string | null | undefined | false>) {
  return lines.filter((line): line is string => Boolean(line && line.trim())).join("\n");
}

function normalizeShareLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function truncateShareValue(value: string, maxLength: number) {
  const normalized = normalizeShareLine(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const truncated = normalized.slice(0, Math.max(0, maxLength - 1));
  const safeBoundary = truncated.lastIndexOf(" ");
  const compact = safeBoundary >= Math.floor(maxLength * 0.6) ? truncated.slice(0, safeBoundary) : truncated;
  return `${compact.trimEnd()}…`;
}

type OperationalWhatsAppShareInput = {
  heading: string;
  state: string;
  action: string;
  ctaPath?: string | null;
  checkpoint?: string | null;
};

export function buildOperationalWhatsAppShareText(input: OperationalWhatsAppShareInput) {
  return buildWhatsAppShareText([
    truncateShareValue(input.heading, 88),
    `Estado: ${truncateShareValue(input.state, 96)}`,
    `Ação: ${truncateShareValue(input.action, 132)}`,
    input.ctaPath ? `Abrir: ${truncateShareValue(input.ctaPath, 72)}` : null,
    input.checkpoint ? `Marco: ${truncateShareValue(input.checkpoint, 92)}` : null,
  ]);
}

export function buildMailtoLink(to: string | null, subject: string, body: string) {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${to ?? ""}?${params.toString()}`;
}

export function buildWhatsAppShareText(lines: Array<string | null | undefined | false>) {
  return joinShareLines(
    lines.map((line) => (typeof line === "string" ? normalizeShareLine(line) : line)),
  );
}

export function buildWhatsAppShareLink(text: string) {
  const params = new URLSearchParams({ text });
  return `https://wa.me/?${params.toString()}`;
}