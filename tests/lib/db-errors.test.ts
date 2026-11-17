import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "../../src/lib/db-errors";

describe("isUniqueViolation", () => {
  it("detects a Prisma 8 unique violation (sqlState 23505)", () => {
    const error = Object.assign(new Error("duplicate key"), { kind: "sql_query", sqlState: "23505" });
    expect(isUniqueViolation(error)).toBe(true);
  });

  it("detects it when middleware wrapped the driver error", () => {
    const driverError = Object.assign(new Error("duplicate key"), { sqlState: "23505" });
    expect(isUniqueViolation(new Error("query failed", { cause: driverError }))).toBe(true);
  });

  it("ignores other database errors, such as a foreign key violation", () => {
    expect(isUniqueViolation(Object.assign(new Error("fk"), { sqlState: "23503" }))).toBe(false);
  });

  it("ignores plain errors and non-errors", () => {
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation("23505")).toBe(false);
  });
});
