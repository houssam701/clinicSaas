import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextRequest } from "next/server";

// The routes are tested without a database or a real login:
// auth() and the repositories are replaced by mocks we control per test.
vi.mock("../../src/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("../../src/repository/user-repository", () => ({
  UserRepository: {
    findById:          vi.fn(),
    findAll:           vi.fn(),
    findPage:          vi.fn(),
    createUser:        vi.fn(),
    updateUser:        vi.fn(),
    deleteUser:        vi.fn(),
    emailExists:       vi.fn(),
    emailExistsExcept: vi.fn(),
    superAdminExists:  vi.fn(),
  },
}));
vi.mock("../../src/repository/clinic-repository", () => ({
  ClinicRepository: { exists: vi.fn() },
}));

import { auth } from "../../src/lib/auth";
import { UserRepository } from "../../src/repository/user-repository";
import { ClinicRepository } from "../../src/repository/clinic-repository";
import { POST } from "../../src/app/api/users/route";
import { GET, PATCH, DELETE } from "../../src/app/api/users/[id]/route";
import { UserRole } from "../../src/types/users";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CLINIC_A = "11111111-1111-4111-8111-111111111111";
const CLINIC_B = "22222222-2222-4222-8222-222222222222";

const SUPER_ADMIN = { id: "super-admin", role: UserRole.SuperAdmin, clinic_id: null };
const ADMIN_A     = { id: "admin-a",     role: UserRole.Admin,      clinic_id: CLINIC_A };
const STAFF_A     = { id: "staff-a",     role: UserRole.Staff,      clinic_id: CLINIC_A };
const STAFF_B     = { id: "staff-b",     role: UserRole.Staff,      clinic_id: CLINIC_B };
const ADMIN_B     = { id: "admin-b",     role: UserRole.Admin,      clinic_id: CLINIC_B };

type Caller = { id: string; role: UserRole; clinic_id: string | null };

function signInAs(caller: Caller | null) {
  (auth as unknown as Mock).mockResolvedValue(caller ? { user: caller } : null);
}

/** The user the repository returns for the id in the URL. */
function targetIs(user: Caller) {
  vi.mocked(UserRepository.findById).mockResolvedValue({
    ...user,
    first_name: "Test",
    last_name:  "User",
    email:      `${user.id}@clinic.test`,
  } as never);
}

function request(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/users/x", {
    method,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}

const routeContext = (id: string) => ({ params: Promise.resolve({ id }) });

const uniqueViolation = () => Object.assign(new Error("duplicate key"), { kind: "sql_query", sqlState: "23505" });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(ClinicRepository.exists).mockResolvedValue(true);
});

// ─── PATCH /api/users/[id] ───────────────────────────────────────────────────

describe("PATCH /api/users/[id]", () => {
  it("returns 401 when not logged in", async () => {
    signInAs(null);
    const res = await PATCH(request("PATCH", { first_name: "New" }), routeContext(STAFF_A.id));
    expect(res.status).toBe(401);
  });

  it("forbids an Admin of clinic A from editing a Staff user in clinic B (403)", async () => {
    signInAs(ADMIN_A);
    targetIs(STAFF_B);
    const res = await PATCH(request("PATCH", { first_name: "Hacked" }), routeContext(STAFF_B.id));
    expect(res.status).toBe(403);
    expect(UserRepository.updateUser).not.toHaveBeenCalled();
  });

  it("forbids an Admin from editing another Admin (403)", async () => {
    signInAs(ADMIN_A);
    targetIs({ ...ADMIN_B, clinic_id: CLINIC_A });
    const res = await PATCH(request("PATCH", { first_name: "X" }), routeContext(ADMIN_B.id));
    expect(res.status).toBe(403);
  });

  it("forbids an Admin from promoting their Staff to Admin (403)", async () => {
    signInAs(ADMIN_A);
    targetIs(STAFF_A);
    const res = await PATCH(request("PATCH", { role: UserRole.Admin }), routeContext(STAFF_A.id));
    expect(res.status).toBe(403);
    expect(UserRepository.updateUser).not.toHaveBeenCalled();
  });

  it("forbids an Admin from moving their Staff to another clinic (403)", async () => {
    signInAs(ADMIN_A);
    targetIs(STAFF_A);
    const res = await PATCH(request("PATCH", { clinic_id: CLINIC_B }), routeContext(STAFF_A.id));
    expect(res.status).toBe(403);
    expect(UserRepository.updateUser).not.toHaveBeenCalled();
  });

  it("lets an Admin edit a Staff user in their own clinic (200)", async () => {
    signInAs(ADMIN_A);
    targetIs(STAFF_A);
    vi.mocked(UserRepository.updateUser).mockResolvedValue({ ...STAFF_A, first_name: "New" } as never);
    const res = await PATCH(request("PATCH", { first_name: "New" }), routeContext(STAFF_A.id));
    expect(res.status).toBe(200);
    expect(UserRepository.updateUser).toHaveBeenCalledWith(STAFF_A.id, { first_name: "New" });
  });

  it("forbids Staff from editing another user (403)", async () => {
    signInAs(STAFF_A);
    targetIs({ ...STAFF_B, clinic_id: CLINIC_A });
    const res = await PATCH(request("PATCH", { first_name: "X" }), routeContext(STAFF_B.id));
    expect(res.status).toBe(403);
  });

  it("forbids Staff from changing their own email or role (403)", async () => {
    signInAs(STAFF_A);
    targetIs(STAFF_A);
    const emailRes = await PATCH(request("PATCH", { email: "new@clinic.test" }), routeContext(STAFF_A.id));
    const roleRes  = await PATCH(request("PATCH", { role: UserRole.Admin }), routeContext(STAFF_A.id));
    expect(emailRes.status).toBe(403);
    expect(roleRes.status).toBe(403);
    expect(UserRepository.updateUser).not.toHaveBeenCalled();
  });

  it("refuses a second SuperAdmin (409)", async () => {
    signInAs(SUPER_ADMIN);
    targetIs(ADMIN_A);
    const res = await PATCH(request("PATCH", { role: UserRole.SuperAdmin }), routeContext(ADMIN_A.id));
    expect(res.status).toBe(409);
    expect(UserRepository.updateUser).not.toHaveBeenCalled();
  });

  it("refuses removing the role from the only SuperAdmin (400)", async () => {
    signInAs(SUPER_ADMIN);
    targetIs(SUPER_ADMIN);
    const res = await PATCH(request("PATCH", { role: UserRole.Admin }), routeContext(SUPER_ADMIN.id));
    expect(res.status).toBe(400);
  });

  it("returns 409, not 500, when another request takes the email first", async () => {
    signInAs(SUPER_ADMIN);
    targetIs(STAFF_A);
    vi.mocked(UserRepository.emailExistsExcept).mockResolvedValue(false); // the check passes...
    vi.mocked(UserRepository.updateUser).mockRejectedValue(uniqueViolation()); // ...but the write loses the race
    const res = await PATCH(request("PATCH", { email: "taken@clinic.test" }), routeContext(STAFF_A.id));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Email already in use" });
  });
});

// ─── GET /api/users/[id] ─────────────────────────────────────────────────────

describe("GET /api/users/[id]", () => {
  it("forbids an Admin from viewing a user in another clinic (403)", async () => {
    signInAs(ADMIN_A);
    targetIs(STAFF_B);
    const res = await GET(request("GET"), routeContext(STAFF_B.id));
    expect(res.status).toBe(403);
  });

  it("forbids Staff from viewing another user's profile (403)", async () => {
    signInAs(STAFF_A);
    targetIs({ ...STAFF_B, clinic_id: CLINIC_A });
    const res = await GET(request("GET"), routeContext(STAFF_B.id));
    expect(res.status).toBe(403);
  });
});

// ─── DELETE /api/users/[id] ──────────────────────────────────────────────────

describe("DELETE /api/users/[id]", () => {
  it("forbids an Admin from deleting Staff in another clinic (403)", async () => {
    signInAs(ADMIN_A);
    targetIs(STAFF_B);
    const res = await DELETE(request("DELETE"), routeContext(STAFF_B.id));
    expect(res.status).toBe(403);
    expect(UserRepository.deleteUser).not.toHaveBeenCalled();
  });

  it("forbids Staff from deleting anyone (403)", async () => {
    signInAs(STAFF_A);
    targetIs({ ...STAFF_B, clinic_id: CLINIC_A });
    const res = await DELETE(request("DELETE"), routeContext(STAFF_B.id));
    expect(res.status).toBe(403);
    expect(UserRepository.deleteUser).not.toHaveBeenCalled();
  });

  it("lets an Admin delete Staff in their own clinic (204)", async () => {
    signInAs(ADMIN_A);
    targetIs(STAFF_A);
    const res = await DELETE(request("DELETE"), routeContext(STAFF_A.id));
    expect(res.status).toBe(204);
    expect(UserRepository.deleteUser).toHaveBeenCalledWith(STAFF_A.id);
  });
});

// ─── POST /api/users ─────────────────────────────────────────────────────────

describe("POST /api/users", () => {
  const newStaff = {
    email:      "new@clinic.test",
    password:   "a-strong-password",
    first_name: "New",
    last_name:  "Staff",
    role:       UserRole.Staff,
    clinic_id:  CLINIC_A,
  };

  it("forbids an Admin from creating users here (403)", async () => {
    signInAs(ADMIN_A);
    const res = await POST(request("POST", newStaff));
    expect(res.status).toBe(403);
    expect(UserRepository.createUser).not.toHaveBeenCalled();
  });

  it("returns 409 when the email is already in use", async () => {
    signInAs(SUPER_ADMIN);
    vi.mocked(UserRepository.emailExists).mockResolvedValue(true);
    const res = await POST(request("POST", newStaff));
    expect(res.status).toBe(409);
    expect(UserRepository.createUser).not.toHaveBeenCalled();
  });

  it("returns 409, not 500, when two requests create the same email at once", async () => {
    signInAs(SUPER_ADMIN);
    vi.mocked(UserRepository.superAdminExists).mockResolvedValue(true);
    vi.mocked(UserRepository.emailExists).mockResolvedValue(false); // both requests see "free"...
    vi.mocked(UserRepository.createUser).mockRejectedValue(uniqueViolation()); // ...the second insert fails
    const res = await POST(request("POST", newStaff));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Email already in use" });
  });

  it("still surfaces unexpected database errors as failures", async () => {
    signInAs(SUPER_ADMIN);
    vi.mocked(UserRepository.emailExists).mockResolvedValue(false);
    vi.mocked(UserRepository.createUser).mockRejectedValue(new Error("connection lost"));
    await expect(POST(request("POST", newStaff))).rejects.toThrow("connection lost");
  });
});
