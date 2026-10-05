export function privateMeasurementPath(path: string) {
  return [
    "/owner",
    "/inquiry-progress",
    "/shop-response",
    "/admin",
    "/request-status",
  ].some((prefix) => path === prefix || path.startsWith(prefix + "/"));
}

export function automatedMeasurementAgent(agent: string) {
  return /bot\b|crawler|spider|headless|lightpanda\b|lighthouse|pagespeed|vicrez-.*audit/i.test(
    agent,
  );
}

export function localMeasurementReferrer(referrer: string) {
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    return (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host === "[::1]" ||
      /^127(?:\.\d{1,3}){3}$/.test(host)
    );
  } catch {
    return false;
  }
}

/** Also enforced at collection time; no raw user agent is saved. */
export function measurementRequestAllowed(request: Request) {
  return (
    request.headers.get("dnt") !== "1" &&
    request.headers.get("sec-gpc") !== "1" &&
    !automatedMeasurementAgent(request.headers.get("user-agent") || "")
  );
}
