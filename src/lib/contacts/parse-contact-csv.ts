import * as XLSX from 'xlsx';

/**
 * Spreadsheet & CSV parsing for the contacts import modal.
 * Supports .xlsx, .xls, .csv, .tsv files with flexible column headers.
 */

export interface ParsedContactRow {
  phone: string;
  name?: string;
  email?: string;
  company?: string;
  /** Tag names from the optional `tags` column (comma/semicolon separated). */
  tagNames: string[];
}

/** Split a cell value into unique tag names (case-insensitive de-dupe). */
export function parseTagCell(value: string | undefined | null): string[] {
  if (!value) return [];
  const str = String(value).trim();
  if (!str) return [];

  const seen = new Set<string>();
  const names: string[] = [];

  for (const part of str.split(/[,;]/)) {
    const name = part.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }

  return names;
}

export interface ParseContactSpreadsheetResult {
  rows: ParsedContactRow[];
  hasTagsColumn: boolean;
  hasCompanyColumn: boolean;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Universal parser for Contacts from either an ArrayBuffer (Excel/CSV) or text string.
 */
export function parseContactSpreadsheet(
  data: ArrayBuffer | string,
  filename?: string
): ParseContactSpreadsheetResult {
  try {
    let workbook: XLSX.WorkBook;

    if (typeof data === 'string') {
      workbook = XLSX.read(data, { type: 'string' });
    } else {
      workbook = XLSX.read(data, { type: 'array' });
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { rows: [], hasTagsColumn: false, hasCompanyColumn: false };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
      return { rows: [], hasTagsColumn: false, hasCompanyColumn: false };
    }

    // Convert sheet to JSON array of row objects
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: '',
      raw: false,
    });

    if (rawRows.length === 0) {
      return { rows: [], hasTagsColumn: false, hasCompanyColumn: false };
    }

    // Find matching column names dynamically
    const sampleRow = rawRows[0] || {};
    const headers = Object.keys(sampleRow);

    const phoneKey = headers.find((h) => {
      const n = normalizeHeader(h);
      return (
        n === 'phone' ||
        n === 'phonenumber' ||
        n === 'mobile' ||
        n === 'mobilenumber' ||
        n === 'contact' ||
        n === 'contactnumber' ||
        n === 'cell' ||
        n === 'telephone' ||
        n === 'whatsapp' ||
        n === 'number'
      );
    });

    if (!phoneKey) {
      // Fallback: search for any column whose values look like 10-digit phone numbers
      const guessedPhoneKey = headers.find((h) => {
        const val = String(sampleRow[h] || '').replace(/\D/g, '');
        return val.length >= 10 && val.length <= 13;
      });
      if (!guessedPhoneKey) {
        return { rows: [], hasTagsColumn: false, hasCompanyColumn: false };
      }
    }

    const effectivePhoneKey = phoneKey || headers.find((h) => {
      const val = String(sampleRow[h] || '').replace(/\D/g, '');
      return val.length >= 10 && val.length <= 13;
    })!;

    const nameKey = headers.find((h) => {
      const n = normalizeHeader(h);
      return (
        n === 'name' ||
        n === 'fullname' ||
        n === 'customername' ||
        n === 'contactname' ||
        n === 'clientname' ||
        n === 'person' ||
        n === 'buyer'
      );
    });

    const emailKey = headers.find((h) => {
      const n = normalizeHeader(h);
      return n === 'email' || n === 'emailaddress' || n === 'mail' || n === 'mailid';
    });

    const companyKey = headers.find((h) => {
      const n = normalizeHeader(h);
      return (
        n === 'company' ||
        n === 'companyname' ||
        n === 'business' ||
        n === 'businessname' ||
        n === 'organization' ||
        n === 'firm' ||
        n === 'enterprise'
      );
    });

    const tagsKey = headers.find((h) => {
      const n = normalizeHeader(h);
      return (
        n === 'tags' ||
        n === 'tag' ||
        n === 'labels' ||
        n === 'label' ||
        n === 'category' ||
        n === 'source' ||
        n === 'segment'
      );
    });

    const rows: ParsedContactRow[] = [];

    for (const raw of rawRows) {
      const rawPhone = String(raw[effectivePhoneKey] || '').trim();
      const cleanDigits = rawPhone.replace(/\D/g, '');
      if (!cleanDigits || cleanDigits.length < 7) continue;

      // Format clean phone number
      const phone =
        cleanDigits.length === 10
          ? `+91${cleanDigits}`
          : cleanDigits.startsWith('91') && cleanDigits.length === 12
          ? `+${cleanDigits}`
          : rawPhone.startsWith('+')
          ? rawPhone
          : `+${cleanDigits}`;

      const name = nameKey && raw[nameKey] ? String(raw[nameKey]).trim() : undefined;
      const email = emailKey && raw[emailKey] ? String(raw[emailKey]).trim() : undefined;
      const company = companyKey && raw[companyKey] ? String(raw[companyKey]).trim() : undefined;
      const tagNames = tagsKey && raw[tagsKey] ? parseTagCell(String(raw[tagsKey])) : [];

      rows.push({
        phone,
        name: name || undefined,
        email: email || undefined,
        company: company || undefined,
        tagNames,
      });
    }

    return {
      rows,
      hasTagsColumn: Boolean(tagsKey),
      hasCompanyColumn: Boolean(companyKey),
    };
  } catch (error) {
    console.error('[Parse Spreadsheet Error]:', error);
    return { rows: [], hasTagsColumn: false, hasCompanyColumn: false };
  }
}

/** Backward compatibility alias */
export function parseContactCsv(text: string): ParseContactSpreadsheetResult {
  return parseContactSpreadsheet(text);
}
