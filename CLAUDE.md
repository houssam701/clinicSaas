# Clinic SaaS — agent instructions

Before writing or changing code, read and follow the project skills. They are
mandatory, not suggestions:

- `.agents/skills/clinic-code-architecture/SKILL.md` — where server actions
  live and how they are named, URL paths (`src/config/path.ts`), the shared API client (`sendApiJson`,
  `serverApiFetch`), helper placement, Zod messages, SOLID and performance rules.
- `.agents/skills/clinic-ui-design/SKILL.md` — colors (`bg-bgColor`, card
  surfaces), light/dark mode, layout, buttons and cursor rules.
- `.agents/skills/prisma-8/SKILL.md` — before touching `src/prisma/contract.prisma`,
  migrations, or ORM queries.

Short version of the rules most often broken:

1. Server actions go in `src/actions/<verb-noun>.ts` (one per file), never in `src/app/`.
2. Server-side API calls use `sendApiJson` / `serverApiFetch` from `src/lib/server-api.ts`, never raw `fetch`.
3. No hardcoded URLs: every page and API path comes from `PATHS` / `API_PATHS` in `src/config/path.ts` (add new routes there first).
4. Every growing list is paginated end to end (`PaginationQuerySchema`, `findPage`, `<Pagination>`); see the architecture skill §3b.
5. Import Zod's `z` from `src/lib/zod.ts`, never from `"zod"`.
6. Icons always come from `react-icons` (default `react-icons/hi2`, imported by name). No inline `<svg>` icons.
7. No plain white page backgrounds under the dashboard; follow the ui-design skill.
