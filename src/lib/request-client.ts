type HeaderSource = {
  get(name: string): string | null;
};

export function getClientIpFromHeaders(headers: HeaderSource) {
  const forwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");

  return forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
}