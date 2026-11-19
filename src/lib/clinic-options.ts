import { listCurrencies, listTimeZones } from "./time-zone";

export interface PickerOption {
  value: string;
  label: string;
}

/** The saved value is always an option, so a picker never shows (and saves) another one. */
const withCurrent = (list: string[], current?: string) => (current && !list.includes(current) ? [current, ...list] : list);

/**
 * Time zone choices for a picker. Build them on the server and pass them to
 * the client form: the browser's Intl data can differ from Node's, and
 * different option text breaks hydration.
 */
export function timeZoneOptions(current?: string): PickerOption[] {
  return withCurrent(listTimeZones(), current).map((zone) => ({ value: zone, label: zone.replace(/_/g, " ") }));
}

/** Currency choices ("EUR · Euro"), built on the server for the same reason. */
export function currencyOptions(current?: string): PickerOption[] {
  const names = new Intl.DisplayNames(["en"], { type: "currency" });
  return withCurrent(listCurrencies(), current).map((code) => ({ value: code, label: `${code} · ${names.of(code) ?? code}` }));
}
