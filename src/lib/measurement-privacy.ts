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
  return /bot\b|crawler|spider|headless|lighthouse|pagespeed|vicrez-.*audit/i.test(
    agent,
  );
}

/** Also enforced at collection time; no raw user agent is saved. */
export function measurementRequestAllowed(request: Request) {
  return (
    request.headers.get("dnt") !== "1" &&
    request.headers.get("sec-gpc") !== "1" &&
    !automatedMeasurementAgent(request.headers.get("user-agent") || "")
  );
}
