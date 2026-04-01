/**
 * YooKassa IP whitelist verification.
 * YooKassa does NOT use HMAC for webhooks — IP verification is the security mechanism.
 * Source: https://yookassa.ru/developers/using-api/webhooks
 */

const YOOKASSA_CIDRS = [
  { ip: 0xB9474C00, mask: 0xFFFFFFE0 }, // 185.71.76.0/27
  { ip: 0xB9474D00, mask: 0xFFFFFFE0 }, // 185.71.77.0/27
  { ip: 0x4D4B9900, mask: 0xFFFFFF80 }, // 77.75.153.0/25
  { ip: 0x4D4B9A80, mask: 0xFFFFFF80 }, // 77.75.154.128/25
  { ip: 0x4D4B9C0B, mask: 0xFFFFFFFF }, // 77.75.156.11/32
  { ip: 0x4D4B9C23, mask: 0xFFFFFFFF }, // 77.75.156.35/32
];

function parseIPv4(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export function isYooKassaIP(ipStr: string): boolean {
  if (process.env.NODE_ENV === 'development') return true; // skip in dev
  try {
    const ip = parseIPv4(ipStr);
    return YOOKASSA_CIDRS.some(c => (ip & c.mask) === (c.ip & c.mask));
  } catch {
    return false;
  }
}
