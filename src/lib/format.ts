export function rupiah(amount: number | null | undefined) {
  if (amount == null) return "-";
  return "Rp " + amount.toLocaleString("id-ID");
}

/** Masks phone numbers, emails and bank-account-looking digit runs. */
export function maskSensitive(text: string) {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "•••@•••")
    .replace(/(?:\+?\d[\s().-]?){8,}/g, "••• disamarkan •••")
    .replace(/\b\d{10,}\b/g, "••••••••");
}

export function containsSensitive(text: string) {
  return maskSensitive(text) !== text;
}

/** Rough km distance between two coordinates. */
export function distanceKm(
  aLat: number | null | undefined,
  aLng: number | null | undefined,
  bLat: number | null | undefined,
  bLng: number | null | undefined,
) {
  if (aLat == null || aLng == null || bLat == null || bLng == null) return null;
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} menit lalu`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.round(hours / 24)} hari lalu`;
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
