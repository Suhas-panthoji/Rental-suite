/** All money is stored as integer paise. Convert at the edges. */

export function toPaise(input: string | number): number {
  const n = typeof input === "number" ? input : parseFloat(String(input).replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function fromPaise(paise: number): number {
  return paise / 100;
}

export function formatINR(paise: number): string {
  const decimals = paise % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(fromPaise(paise));
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
  "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  return o ? `${t} ${o}` : t;
}

function wholeWords(n: number): string {
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 1_00_00_000);
  const lakh = Math.floor(n / 1_00_000) % 100;
  const thousand = Math.floor(n / 1000) % 100;
  const hundred = Math.floor(n / 100) % 10;
  const rest = n % 100;
  const parts: string[] = [];
  if (crore) parts.push(`${wholeWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigitWords(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigitWords(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigitWords(rest));
  return parts.join(" ");
}

/** e.g. 123450 -> "Rupees One Lakh Twenty Three Thousand Four Hundred and Fifty Only" */
export function amountInWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const only = paise % 100;
  let out = `Rupees ${wholeWords(rupees)}`;
  if (only) out += ` and ${twoDigitWords(only)} Paise`;
  return `${out} Only`;
}
