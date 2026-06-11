/**
 * Serializable format strings.
 *
 * Numbers (d3-like subset): `[prefix][,][.N][f|%|s|d][suffix]`
 *   ',.2f' → 1 234.57   '.0%' → 42%   '$,.0f' → $1 235   's' → 1.2M   'd' → 1235
 * Dates (strftime subset): %d %m %b %B %Y %y %H %M %S
 */
const NUMBER_PATTERN = /^(.*?)(,)?(?:\.(\d+))?([f%sd])(.*)$/;

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function group(text: string): string {
  return text.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatNumberPattern(pattern: string, value: number): string {
  const match = NUMBER_PATTERN.exec(pattern);
  if (!match || !Number.isFinite(value)) return String(value);
  const [, prefix = '', grouping, precisionRaw, type, suffix = ''] = match;
  const precision = precisionRaw !== undefined ? Number(precisionRaw) : undefined;

  let body: string;
  switch (type) {
    case '%': {
      body = (value * 100).toFixed(precision ?? 0) + '%';
      break;
    }
    case 's': {
      const abs = Math.abs(value);
      const units: Array<[number, string]> = [
        [1e9, 'G'],
        [1e6, 'M'],
        [1e3, 'k'],
      ];
      const unit = units.find(([limit]) => abs >= limit);
      body = unit ? Number((value / unit[0]).toFixed(precision ?? 1)) + unit[1] : String(Number(value.toFixed(precision ?? 1)));
      break;
    }
    case 'd': {
      body = String(Math.round(value));
      break;
    }
    default: {
      body = value.toFixed(precision ?? 2);
    }
  }
  if (grouping) {
    const [integer, fraction] = body.split('.');
    body = group(integer ?? body) + (fraction !== undefined ? `.${fraction}` : '');
  }
  return prefix + body + suffix;
}

export function formatDatePattern(pattern: string, date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return pattern.replace(/%([dmbBYyHMS%])/g, (_, token: string) => {
    switch (token) {
      case 'd':
        return pad(date.getDate());
      case 'm':
        return pad(date.getMonth() + 1);
      case 'b':
        return MONTHS_SHORT[date.getMonth()] ?? '';
      case 'B':
        return MONTHS_FULL[date.getMonth()] ?? '';
      case 'Y':
        return String(date.getFullYear());
      case 'y':
        return String(date.getFullYear()).slice(-2);
      case 'H':
        return pad(date.getHours());
      case 'M':
        return pad(date.getMinutes());
      case 'S':
        return pad(date.getSeconds());
      default:
        return '%';
    }
  });
}

/** Universal entry point: numbers via the numeric pattern, dates/timestamps with % via strftime. */
export function formatValue(pattern: string, value: unknown): string {
  if (pattern.includes('%') && /%[dmbBYyHMS]/.test(pattern)) {
    const date = value instanceof Date ? value : new Date(Number(value));
    if (!Number.isNaN(date.getTime())) return formatDatePattern(pattern, date);
  }
  if (typeof value === 'number') return formatNumberPattern(pattern, value);
  return String(value);
}
