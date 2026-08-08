// Dates are stored as ISO `YYYY-MM-DD` everywhere (DB + calendar math) but
// shown to the user as `DD/MM/YYYY`. These helpers convert between the two.

export const formatDate = (iso?: string | null): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso; // leave anything non-ISO untouched
  return `${d}/${m}/${y}`;
};

export const toISODate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Parse an ISO string to a Date, falling back to today if empty/invalid.
export const parseISO = (iso?: string | null): Date => {
  if (iso) {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
};
