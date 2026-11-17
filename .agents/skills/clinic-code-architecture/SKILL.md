---
name: clinic-code-architecture
description: Mandatory code structure for the Clinic SaaS app — where server actions live and how they are named, no hardcoded URLs (PATHS / API_PATHS in src/config/path.ts), the shared server-side API client (sendApiJson / serverApiFetch), where helpers go, Zod messages, and the SOLID + performance rules. Use before adding or changing any page, form, server action, API call, or API route.
---

# Clinic SaaS Code Architecture Rules

These rules are mandatory for every agent working on this codebase. Follow the
existing examples named below instead of inventing a new pattern.

---

## 1. Server Actions (STRICT)

> [!IMPORTANT]
> **Server actions NEVER live inside `src/app/`.** No `actions.ts` / `action.ts`
> next to pages.

- **Location:** `src/actions/`
- **One action per file, named after what it does**, in kebab-case:
  `create-user.ts` → `createUserAction`, `update-user.ts` → `updateUserAction`,
  `delete-user.ts` → `deleteUserAction`, `login.ts` → `loginAction`,
  `logout.ts` → `logoutAction`.
- Every file starts with `"use server";`.
- **Only export the action itself (plus types).** Every export of a
  `"use server"` file becomes an endpoint the browser can call, so helpers,
  constants and mappers go in `src/lib/` (see §3).
- Actions that need an id take it as the first argument and are bound in the
  page: `updateUserAction.bind(null, user.id)`.
- After a successful mutation: `revalidatePath(PATHS.<list>())`, then either
  `redirect(...)` (forms) or return `{}` (in-place actions like delete).

---

## 2. Calling the API from the server (STRICT)

> [!IMPORTANT]
> **Never call `fetch(apiUrl(...))` directly** in actions or server components.
> Use the shared client in `src/lib/server-api.ts`.

| Need | Use |
|---|---|
| Mutation from a server action (POST/PUT/PATCH/DELETE, optional JSON body) | `sendApiJson(path, method, body?)` — returns `Response \| null` (`null` = network failure, never throws) |
| Read from a Server Component (GET) | `serverApiFetch(path)` |

- Both forward the caller's cookies, so the API route's `auth()` sees the same
  session. **The API routes are the single place where access is checked** —
  pages and actions must go through them, not call repositories directly.
- Always handle `null` from `sendApiJson`:
  ```ts
  const response = await sendApiJson(API_PATHS.users.list(), "POST", body);
  if (!response) return { error: "Network error — please try again." };
  ```
- Load independent data in parallel with `Promise.all([...])`.
- Build API paths with `API_PATHS` from `src/config/path.ts` (§3), never by hand.

---

## 3. URLs and paths (STRICT)

> [!IMPORTANT]
> **No hardcoded URL paths.** Never write `"/platform/users"`,
> `` `/platform/users/${id}/edit` ``, `"/api/clinics"`, `"/"` etc. in a page,
> component, action, config or API route.

- Every path lives in **`src/config/path.ts`**:
  - `PATHS` — pages (for `href`, `<Form action>`, `redirect`, `revalidatePath`,
    navigation configs, role homes).
  - `API_PATHS` — internal API routes (for `sendApiJson`, `serverApiFetch`).
- Paths with an id or filters are **functions**; they encode ids and drop
  empty query params via `withQuery`:
  ```tsx
  <Link href={PATHS.platform.users.edit(user.id)}>Edit</Link>
  <Link href={PATHS.platform.users.list({ role, clinic_id })}>Admins</Link>
  redirect(PATHS.platform.users.list({ created: 1 }));
  revalidatePath(PATHS.platform.users.list());
  await serverApiFetch(API_PATHS.users.list({ role, clinic_id }));
  await sendApiJson(API_PATHS.users.detail(userId), "PATCH", body);
  ```
- **New page or API route → add its entry to `path.ts` first**, then use it.
  Group entries the way the URL is nested (`PATHS.platform.users.*`,
  `API_PATHS.patients.documents(id)`).
- Do not hand-build query strings (`` `?role=${role}` ``) or
  `encodeURIComponent` ids in call sites — that is `path.ts`'s job.
- `LOGIN_PATH` and `ROLE_HOME_PATH` in `src/config/role-routes.ts` read from
  `PATHS`; keep them that way.

---

## 3b. Lists & pagination (STRICT)

> [!IMPORTANT]
> **Every list that can grow is paginated** in the database, the API and the UI.
> Never load a whole table and slice it in TypeScript.

- **Query schema:** extend `PaginationQuerySchema` from `src/types/pagination.ts`
  (`page` default 1, `limit` default `DEFAULT_PAGE_SIZE` = 20, max 200):
  `export const ListXQuerySchema = PaginationQuerySchema.extend({ ...filters })`.
- **Repository:** return `PaginatedResult<T>` (`{ data, total }`). Build the
  filtered query once in a private `listQuery(filter)`, then run the page and the
  count in parallel:
  ```ts
  const [data, agg] = await Promise.all([
    query.orderBy(...).limit(limit).offset(pageOffset({ page, limit })).all(),
    query.aggregate((a) => ({ count: a.count() })),
  ]);
  ```
  Example: `UserRepository.findPage`.
- **API response:** `{ <items>, total, page, limit }` (e.g. `{ users, total, page, limit }`).
- **UI:** use `<Pagination>` from `src/components/ui/pagination.tsx`, which needs no client JS:
  ```tsx
  <Pagination
    page={page}
    pageSize={PAGE_SIZE}
    total={total}
    itemLabel="users"
    hrefForPage={(p) => PATHS.platform.users.list({ role, clinic_id, page: p })}
  />
  ```
  `hrefForPage` must keep the current filters. Filter links and filter forms must
  **not** carry `page`, so changing a filter goes back to page 1.
- In the page: read `page` from `searchParams` (bad values fall back to 1), and
  if `page` is past the last page while `total > 0`, `redirect` to the last page
  (this happens after deleting the last row of the last page).
- Page-number math (`getPageItems`, `pageRange`, `totalPages`) lives in
  `src/lib/pagination.ts`. Reuse it; don't rewrite it.

---

## 4. Shared helpers

- **Feature form helpers** (form readers, API-error → form-state mappers,
  form state types) go in `src/lib/<feature>-form.ts`.
  Example: `src/lib/user-form.ts` (`readUserForm`, `toUserFormState`,
  `UserFormState`).
- Map API status codes to form errors in **one** function per feature
  (400 → field errors, 409 → conflict field, 401/403 → session message,
  404 → not found, null → network error). Do not repeat this per action.

---

## 5. Forms & UI components

- One component per job (SRP). Reuse one form for create **and** edit:
  `src/components/platform/user-form.tsx` takes `mode` and an injected
  `action` (dependency inversion) — mode-specific text lives in a lookup
  table (`MODE_COPY`), not in `if`s scattered through the markup (OCP).
- Form inputs are **controlled** (`useState`) so React 19 does not clear them
  after a failed submit.
- Show API field errors under each field (`fieldErrors[name][0]`) and a
  general banner for `error`.
- Confirmations use `<ConfirmDialog>` from `src/components/ui/confirm-dialog.tsx`
  (native `<dialog>`, no modal library). Never put a `<dialog>` directly inside a
  table cell or scroll container: `ConfirmDialog` portals to `<body>` and only
  mounts while open. The trigger owns `open` state and calls the action in
  `useTransition`; pass the API error back through `error`.
  Example: `src/components/platform/delete-user-button.tsx`.
- In-place mutations use `useTransition` + the server action.
- Filters/search use `next/form` `<Form>` (client navigation), never a plain
  `<form method="GET">` (that reloads the whole page).

---

## 6. Validation (Zod)

- **Import `z` from `src/lib/zod.ts`, never from `"zod"`.** That module sets
  the project-wide readable messages ("First name is required.",
  "Password must be at least 8 characters.").
- Schemas live in `src/types/<entity>.ts`. Write a custom message only when
  the default would be unclear; never write developer wording such as
  "Invalid clinic_id format".
- Zod 4 cannot `.omit()` a refined schema: keep a base `z.object(...)` and
  refine a separate export (see `CreateUserBaseSchema` in `src/types/users.ts`).

---

## 7. Business rules to preserve

- Exactly **one SuperAdmin** exists. It has `clinic_id = null`; Admin and
  Staff must always have a clinic. Enforced in `POST /api/users` and
  `PATCH /api/users/[id]` — keep these checks when touching user routes.
- Check that a referenced clinic exists before insert/update, so a foreign key
  failure never becomes a 500.

---

## 8. Performance

- No new npm dependency without a clear need — prefer a few lines of code
  (e.g. `TopLoader`, native `<dialog>`).
- Keep pages as Server Components; only interactive leaves are
  `"use client"`.
- Use `prefetch={false}` on links repeated per table row.
- Animate with CSS transforms/opacity, not layout properties; avoid
  re-rendering React for animations.
