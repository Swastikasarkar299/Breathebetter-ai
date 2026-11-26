// Input sanitization and API validation utilities

export function sanitizeText(value, maxLen = 500) {
  const clean = [...String(value ?? '')]
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');
  return clean.trim().slice(0, maxLen);
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
}

export function validateLatLon(latRaw, lonRaw) {
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { valid: false, error: 'Latitude and longitude must be finite numbers.' };
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return { valid: false, error: 'Coordinates out of valid geographic bounds (-90..90, -180..180).' };
  }
  return { valid: true, lat, lon };
}
