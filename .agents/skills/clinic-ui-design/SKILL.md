---
name: clinic-ui-design
description: UI design standards, bgColor theme tokens, light/dark mode system, SOLID sidebar architecture, and responsive UX guidelines for the Clinic SaaS platform.
---

# Clinic SaaS UI & Design System Guidelines

This skill defines the mandatory UI, theming, and layout patterns for all AI agents working on the Clinic SaaS application.

---

## 1. Background Color Rule (STRICT)

> [!IMPORTANT]
> **NO PLAIN WHITE BACKGROUNDS UNDER THE DASHBOARD!**
> Under the dashboard layout, the canvas and page containers MUST use Tailwind's `bgColor` (`#f1f5f8`).
> Never use `bg-white` for full-page backgrounds, canvas wrappers, or sidebar containers.

- **Light Mode Canvas:** `bg-bgColor` (`#f1f5f8`)
- **Dark Mode Canvas:** `dark:bg-slate-950`
- **Sidebar Surface:** `bg-bgColor dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80`
- **Cards & Content Surfaces:** `bg-slate-200/50 dark:bg-slate-900/70 border border-slate-300/50 dark:border-slate-800/80`

---

## 2. Dark & Light Mode System

- **Default Mode:** Light mode ("white mode") is the default.
- **Implementation:** Powered by `ThemeProvider` in `src/context/theme-context.tsx`.
- **Modes Supported:** `"light"` (default), `"dark"`, and `"system"` (auto-detect OS preference).
- **Tailwind Activation:** Classes are toggled via the `.dark` class on the `<html>` root (`darkMode: "class"`).
- **Storage:** Persisted in `localStorage` under key `clinic_ui_theme`.
- **Usage in Components:**
  ```tsx
  import { useTheme } from "@/context/theme-context";

  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  ```

---

## 3. SOLID Architecture for Layout & Navigation

All navigation and sidebar elements MUST adhere to SOLID principles:

1. **Single Responsibility (SRP):**
   - Each component has one distinct job:
     - `SidebarBrand`: Renders logo and typography.
     - `EmergencyCard`: Renders emergency tile with mic icon & red alert dot.
     - `SidebarItem`: Renders a single active-aware navigation link.
     - `SidebarNav`: Semantic `<nav>` list container.
     - `ThemeToggle`: Theme switcher.
     - `MobileSidebar`: Responsive sliding drawer for small screens.
     - `Sidebar`: Composed desktop container.

2. **Open-Closed Principle (OCP):**
   - Navigation links and emergency configurations are NEVER hardcoded in UI components.
   - All items come from the configuration object in `src/config/navigation.ts`.
   - To add a new menu link, update `navigationConfig.mainNav` without modifying component render logic.

3. **Interface Segregation (ISP):**
   - Navigation contracts are cleanly typed in `src/types/navigation.ts` (`NavItem`, `EmergencyActionConfig`, `BrandConfig`).

---

## 4. Responsive & User-Friendly Design

- **Mobile First & Responsive:**
  - On screens `< lg` (mobile/tablet), show `MobileSidebar` with sticky topbar, logo, and sliding drawer.
  - On screens `>= lg` (desktop), show fixed/sticky `Sidebar` (`w-64`).
- **Interactive Feedback:**
  - Active links must indicate current page using `usePathname()` with bold text, subtle highlight, and `aria-current="page"`.
  - Buttons and interactive items must provide distinct hover and active states (`transition-all duration-150`).
  - Accessible touch targets (minimum 44x44px for buttons on mobile).
- **Pointer Cursor:**
  - Tailwind v4 resets buttons to `cursor: default`. A base rule in `src/app/globals.css` gives every clickable element (buttons, links, selects, labels, radios, checkboxes) `cursor: pointer`, and disabled ones `cursor: not-allowed`.
  - Do not add `cursor-pointer` to each button; keep that base rule. A custom clickable element must be a `<button>`, `<a>`, or have `role="button"` so it is covered.
- **Icons — always `react-icons` (STRICT):**
  - Every icon comes from the `react-icons` package. Never paste inline `<svg>` icons and never add another icon library.
  - Import from the set's subpath so only the icons you use are bundled: `import { HiOutlineTrash } from "react-icons/hi2";` (never `import * as Icons` or the package root).
  - Default set is **Heroicons v2 (`react-icons/hi2`)**: `HiOutline*` for actions inside text and buttons, `Hi*` (solid) for small filled glyphs such as chevrons. Use another set only when Heroicons has no match.
  - Size and color with Tailwind classes (`className="h-4 w-4"`, the color comes from `currentColor`), and mark decorative icons `aria-hidden="true"`; the button or link carries the text or `aria-label`.
  - In use: pagination arrows `HiChevronLeft` / `HiChevronRight`, Edit `HiOutlinePencilSquare`, Delete `HiOutlineTrash`.
- **Row Actions Look Like Buttons:**
  - Table row actions (Edit, Delete, ...) are bordered buttons with an icon + label, never bare text links:
    - Edit: `border border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-primary/5 hover:text-primary`
    - Delete (destructive): `border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white`
  - Each has `focus-visible:ring-4` and an `aria-label` that names the row (e.g. "Delete Amira Hassan").
  - Destructive actions always ask for confirmation first with `<ConfirmDialog>` (`src/components/ui/confirm-dialog.tsx`).
- **Modals Must Work on Phones:**
  - Always a **centered popup** (not a bottom sheet), on every screen size.
  - Rendered through a portal on `<body>` and mounted only while open (`<ConfirmDialog>` does this). A `<dialog>` inside a table cell or scroll container causes overflow.
  - Sized to the viewport: `w-[calc(100vw-2rem)] max-w-md max-h-[calc(100dvh-2rem)]`, `overflow-x-hidden overflow-y-auto`; long titles use `break-words`.
  - On phones the buttons stack full width with the primary action on top (`flex-col-reverse` then `sm:flex-row`), at least 44px tall.
  - Esc and backdrop click close it (not while the action is running). The page behind does not scroll (`html:has(dialog[open]:modal)`), and `scrollbar-gutter: stable` on `html` stops the layout from jumping.
