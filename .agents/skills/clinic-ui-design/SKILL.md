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