// ═══════════════════════════════════════════════════════════════
// CSV PARSER — simple, no dependencies
// ═══════════════════════════════════════════════════════════════

export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  // Handle both comma and tab separated
  const separator = lines[0].includes('\t') ? '\t' : ',';

  const headers = parseLine(lines[0], separator);
  const rows = lines.slice(1).map(line => {
    const values = parseLine(line, separator);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.trim().toLowerCase()] = (values[i] || '').trim();
    });
    return row;
  });

  return { headers: headers.map(h => h.trim()), rows };
}

function parseLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === sep) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

export function toNumber(val: string | undefined): number {
  if (!val || val === '' || val === '-') return 0;
  const cleaned = val.replace(/[,$"'\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function toInt(val: string | undefined): number {
  return Math.round(toNumber(val));
}

export function toMonthNum(val: string | undefined): number {
  if (!val) return 0;
  const months: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6,
    jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9,
    oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
  };
  const lower = val.toLowerCase().trim();
  // Try full month name or abbreviation
  if (months[lower] !== undefined) return months[lower];
  // Try "Oct 25" format
  for (const [key, num] of Object.entries(months)) {
    if (lower.startsWith(key)) return num;
  }
  const n = parseInt(val);
  return isNaN(n) ? 0 : Math.min(12, Math.max(1, n));
}

export function toYear(val: string | undefined): number {
  if (!val) return 0;
  const n = parseInt(val.replace(/['"]/g, ''));
  if (n > 100) return n;
  if (n >= 0 && n <= 99) return 2000 + n;
  return 0;
}

export function parseDate(val: string | undefined): { date: string; dayOfWeek: number } | null {
  if (!val) return null;
  // Try YYYY-MM-DD
  const iso = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const d = new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
    return { date: val, dayOfWeek: d.getDay() };
  }
  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmy = val.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const d = new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]));
    return {
      date: `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`,
      dayOfWeek: d.getDay(),
    };
  }
  return null;
}
