export function attributedLink(href: string, pathname: string, label: string) {
  try {
    const u = new URL(href);
    if (
      !["https:", "http:"].includes(u.protocol) ||
      ![
        "vicrez.com",
        "www.vicrez.com",
        "b2b.vicrez.com",
        "shop.vicrez.com",
        "driver.vicrez.com",
        "drive.vicrez.com",
      ].includes(u.hostname)
    )
      return href;
    const medium =
      pathname === "/"
        ? "home"
        : pathname.startsWith("/installer/")
          ? "installer_detail"
          : pathname.startsWith("/installers/category/")
            ? "category"
            : pathname.startsWith("/installers/")
              ? "location"
              : pathname.startsWith("/guides")
                ? "guide"
                : pathname.split("/")[1] || "other";
    const params = {
      utm_source: "installers",
      utm_medium: medium,
      utm_campaign:
        pathname
          .replace(/^\//, "")
          .replace(/\//g, "_")
          .replace(/[^a-zA-Z0-9_-]/g, "") || "home",
      utm_content: label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 40),
    };
    for (const [k, v] of Object.entries(params))
      if (v && !u.searchParams.has(k)) u.searchParams.set(k, v);
    return u.href;
  } catch {
    return href;
  }
}
