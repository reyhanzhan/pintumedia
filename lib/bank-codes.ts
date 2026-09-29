// Standard Bank Indonesia bank codes, so a raw code like "014" from
// LINKQU_VA_BANK_CODE can be shown to customers as "BCA" instead.
const BANK_NAMES: Record<string, string> = {
  "002": "BRI",
  "008": "Mandiri",
  "009": "BNI",
  "011": "Danamon",
  "013": "Permata",
  "014": "BCA",
  "016": "Maybank Indonesia",
  "019": "Panin",
  "022": "CIMB Niaga",
  "028": "OCBC NISP",
  "147": "Muamalat",
  "200": "BTN",
  "213": "BTPN",
  "426": "Bank Mega",
  "441": "Bukopin",
  "451": "BSI",
  "484": "Keb Hana",
  "494": "BRI Agro",
  "536": "Bank Jago",
  "542": "Jenius (BTPN)",
  "553": "Bank Mayapada",
};

export function bankName(code: string): string {
  const known = BANK_NAMES[code.trim()];
  return known ? `${known} (${code})` : code;
}
