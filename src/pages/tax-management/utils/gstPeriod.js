/** Indian FY month labels used in Documents UI (Apr–Mar order). */
export const GST_UI_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

const MONTH_LABEL_TO_NUM = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12',
  January: '01',
  February: '02',
  March: '03',
  April: '04',
  June: '06',
  July: '07',
  August: '08',
  September: '09',
  October: '10',
  November: '11',
  December: '12',
};

/** Normalise FY label to API form e.g. `"2025-26"`. */
export function normalizeFinancialYear(fy) {
  return String(fy || '').replace(/^FY\s+/i, '').trim();
}

/** Convert UI month label (`Sep`, `September`) to API month (`"09"`). */
export function uiMonthToApiMonth(monthLabel) {
  const key = String(monthLabel || '').trim();
  if (!key) return '';
  if (/^\d{1,2}$/.test(key)) return key.padStart(2, '0');
  return MONTH_LABEL_TO_NUM[key] ?? MONTH_LABEL_TO_NUM[key.slice(0, 3)] ?? '';
}

/** Convert API month number to short UI label. */
export function apiMonthToUiMonth(monthNum) {
  const num = String(monthNum || '').padStart(2, '0');
  const entry = Object.entries(MONTH_LABEL_TO_NUM).find(
    ([label, value]) => value === num && label.length === 3,
  );
  return entry?.[0] ?? num;
}

/** Map Returns tab return type to API value. */
export function uiReturnTypeToApi(returnType) {
  if (!returnType || returnType === 'All Returns') return undefined;
  return returnType.replace(/-/g, '');
}

/** Map Returns FY display to API (`FY 2024-25` → `2024-25` or `FY24-25`). */
export function uiReturnsFyToApi(fyLabel) {
  const normalized = normalizeFinancialYear(fyLabel);
  if (/^\d{4}-\d{2}$/.test(normalized)) {
    return `FY${normalized.slice(2, 4)}-${normalized.slice(5, 7)}`;
  }
  return normalized;
}
