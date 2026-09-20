import sharp from "sharp";
import { InputError } from "./onboarding";
import { UUID } from "./directory-rfq";
export async function sanitizeShopPhoto(raw: Buffer) {
  if (!raw.length || raw.length > 4 * 1024 * 1024)
    throw new InputError(
      "Choose a JPEG, PNG or WebP photo smaller than 4 MB.",
      413,
    );
  try {
    const options = { limitInputPixels: 25000000, failOn: "warning" as const };
    const metadata = await sharp(raw, options).metadata();
    if (
      !["jpeg", "png", "webp"].includes(metadata.format || "") ||
      (metadata.pages || 1) > 1
    )
      throw Error();
    const { data, info } = await sharp(raw, options)
      .rotate()
      .resize({
        width: 1400,
        height: 1400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 78 })
      .toBuffer({ resolveWithObject: true });
    if (data.length > 1500000 || info.width < 100 || info.height < 100)
      throw Error();
    return { data, width: info.width, height: info.height };
  } catch {
    throw new InputError(
      "Use a clear, still JPEG, PNG or WebP photo at least 100 pixels wide and high, up to 25 megapixels.",
    );
  }
}
export function photoIds(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length > 6 ||
    value.some((id) => typeof id !== "string" || !UUID.test(id)) ||
    new Set(value).size !== value.length
  )
    throw new InputError("Select up to six different project photos.");
  return value;
}
export async function validatePhotos(
  client: import("pg").PoolClient,
  installer: string,
  ids: string[],
) {
  if (!ids.length) return;
  const rows = (
    await client.query(
      "SELECT id FROM directory_shop_photos WHERE installer_id=$1 AND id=ANY($2::uuid[]) FOR SHARE",
      [installer, ids],
    )
  ).rows;
  if (rows.length !== ids.length)
    throw new InputError(
      "One or more photos are unavailable or belong to another listing.",
    );
}
export async function publishedPhotos(
  pool: import("pg").Pool,
  installer: string,
  details: Record<string, any>,
  confirmed: unknown,
) {
  if (
    !confirmed ||
    !Array.isArray(details.photo_ids) ||
    !details.photo_ids.length
  )
    return [];
  const ids = photoIds(details.photo_ids);
  return (
    await pool.query(
      "SELECT id,caption,width,height FROM directory_shop_photos WHERE installer_id=$1 AND id=ANY($2::uuid[]) ORDER BY array_position($2::uuid[],id)",
      [installer, ids],
    )
  ).rows;
}
