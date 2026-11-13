import { z } from "zod";

/**
 * Project-wide Zod instance with readable error messages.
 *
 * Every schema imports `z` from here instead of "zod", so this config is
 * always applied before any schema parses. A message written on the schema
 * itself (e.g. `.min(1, "...")`) still wins over these defaults.
 */

// Field names that read badly when generated from the key
const FIELD_LABELS: Record<string, string> = {
  clinic_id: "Clinic",
  patient_id: "Patient",
  user_id: "Staff member",
  appointment_id: "Appointment",
  file_url: "File URL",
  date_of_birth: "Date of birth",
  scheduled_time: "Scheduled time",
  duration_minutes: "Duration",
  module_name: "Module name",
};

function fieldLabel(path: PropertyKey[] | undefined): string {
  const key = [...(path ?? [])].reverse().find((p): p is string => typeof p === "string");
  if (!key) return "This field";
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const words = key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const FORMAT_MESSAGES: Record<string, (label: string) => string> = {
  email: () => "Enter a valid email address.",
  uuid: (label) => `${label} is not a valid ID.`,
  guid: (label) => `${label} is not a valid ID.`,
  url: (label) => `${label} must be a valid URL (e.g. https://...).`,
  datetime: (label) => `${label} must be a valid date and time.`,
  date: (label) => `${label} must be a valid date (YYYY-MM-DD).`,
};

const TYPE_NAMES: Record<string, string> = {
  string: "text",
  number: "a number",
  int: "a whole number",
  boolean: "true or false",
  array: "a list",
  object: "an object",
  date: "a date",
};

z.config({
  customError: (issue) => {
    const label = fieldLabel(issue.path);

    switch (issue.code) {
      case "invalid_type":
        if (issue.input === undefined || issue.input === null) return `${label} is required.`;
        return `${label} must be ${TYPE_NAMES[issue.expected] ?? `a ${issue.expected}`}.`;

      case "too_small": {
        const min = Number(issue.minimum);
        if (issue.origin === "string") {
          return min <= 1
            ? `${label} is required.`
            : `${label} must be at least ${min} characters.`;
        }
        if (issue.origin === "array") return `${label} must contain at least ${min} item${min === 1 ? "" : "s"}.`;
        return `${label} must be ${issue.inclusive ? "at least" : "greater than"} ${min}.`;
      }

      case "too_big": {
        const max = Number(issue.maximum);
        if (issue.origin === "string") return `${label} must be at most ${max} characters.`;
        if (issue.origin === "array") return `${label} can contain at most ${max} items.`;
        return `${label} must be ${issue.inclusive ? "at most" : "less than"} ${max}.`;
      }

      case "invalid_format":
        return FORMAT_MESSAGES[issue.format]?.(label) ?? `${label} has an invalid format.`;

      case "invalid_value":
        if (issue.input === undefined || issue.input === null) return `${label} is required.`;
        return `${label} must be one of: ${issue.values.map(String).join(", ")}.`;

      case "unrecognized_keys":
        return `Unknown field${issue.keys.length === 1 ? "" : "s"}: ${issue.keys.join(", ")}.`;

      case "invalid_union":
        return `${label} has an invalid value.`;

      default:
        return undefined; // fall back to Zod's own message
    }
  },
});

export { z };
