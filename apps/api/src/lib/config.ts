type Environment = Record<string, string | undefined>;

export function getTrustProxyHops(environment: Environment = process.env) {
  const raw = environment.TRUST_PROXY_HOPS;
  if (raw === undefined || raw.trim() === "") {
    if (environment.NODE_ENV === "production") {
      throw new Error("TRUST_PROXY_HOPS must be set explicitly in production (use 0 for direct exposure)");
    }
    return 0;
  }

  const hops = Number(raw);
  if (!Number.isInteger(hops) || hops < 0 || hops > 10) {
    throw new Error("TRUST_PROXY_HOPS must be an integer between 0 and 10");
  }
  return hops;
}

export function getPositiveInteger(
  name: string,
  fallback: number,
  environment: Environment = process.env
) {
  const raw = environment[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}
