import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/repository/user-repository", () => ({
  UserRepository: { findById: vi.fn(), findByEmail: vi.fn() },
}));

import { authConfig } from "../../src/lib/auth";
import { UserRepository } from "../../src/repository/user-repository";
import { UserRole } from "../../src/types/users";

const CLINIC_A = "11111111-1111-4111-8111-111111111111";

// Auth.js calls the jwt callback with more fields; only token and user matter here.
const jwt = (args: { token: Record<string, unknown>; user?: Record<string, unknown> }) =>
  authConfig.callbacks!.jwt!(args as never);

beforeEach(() => vi.resetAllMocks());

describe("auth jwt callback", () => {
  it("stores id, role and clinic at sign-in without a database call", async () => {
    const token = await jwt({
      token: {},
      user:  { id: "admin-a", role: UserRole.Admin, clinic_id: CLINIC_A },
    });
    expect(token).toMatchObject({ id: "admin-a", role: UserRole.Admin, clinic_id: CLINIC_A });
    expect(UserRepository.findById).not.toHaveBeenCalled();
  });

  it("picks up a demotion on the next request", async () => {
    vi.mocked(UserRepository.findById).mockResolvedValue({
      id: "admin-a", role: UserRole.Staff, clinic_id: CLINIC_A,
    } as never);
    const token = await jwt({ token: { id: "admin-a", role: UserRole.Admin, clinic_id: CLINIC_A } });
    expect(token).toMatchObject({ role: UserRole.Staff, clinic_id: CLINIC_A });
  });

  it("ends the session of a deleted user", async () => {
    vi.mocked(UserRepository.findById).mockResolvedValue(null);
    const token = await jwt({ token: { id: "admin-a", role: UserRole.Admin, clinic_id: CLINIC_A } });
    expect(token).toBeNull();
  });

  it("ends a session whose token has no user id", async () => {
    expect(await jwt({ token: { role: UserRole.Admin } })).toBeNull();
    expect(UserRepository.findById).not.toHaveBeenCalled();
  });
});
