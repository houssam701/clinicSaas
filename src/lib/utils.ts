/**
 * Utility function to conditionally join classNames together.
 */
export function cn(...classes: (string | undefined | null | false | Record<string, boolean>)[]) {
  return classes
    .flatMap((item) => {
      if (!item) return [];
      if (typeof item === "string") return item;
      return Object.entries(item)
        .filter(([, value]) => Boolean(value))
        .map(([key]) => key);
    })
    .join(" ");
}
