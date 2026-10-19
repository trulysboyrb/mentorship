// Shared by the middleware (edge) and server pages. No Next.js imports here on purpose.
export const DEVICE_COOKIE = "apex_device";
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 730; // 2 years

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidDeviceToken(value: string | undefined | null): value is string {
  return !!value && UUID.test(value);
}
