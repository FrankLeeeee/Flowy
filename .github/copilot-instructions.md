# Flowy Design Context

## Design Context

### Users
Individual power users who manage multiple workstations (MacBooks, Mac Minis, servers) running various AI harnesses (Claude Code, Codex CLI, Cursor CLI) across distributed machines. They need a single pane of glass to monitor usage, costs, tasks, and runner status across all their environments. The interface should make them feel **efficient**, **in-control**, and **calm** — never overwhelmed despite managing complexity.

### Brand Personality
**Calm, precise, minimal.**

Flowy speaks through restraint. Every element earns its place. The interface should feel like a well-organized workspace — quiet confidence, not flashy dashboards. Information density is high but never cluttered.

### Aesthetic Direction
- **Primary reference:** Linear — clean lines, soft shadows, muted palette, typographic precision
- **Anti-references:** Busy enterprise dashboards, overly playful consumer apps, heavy gradients or skeuomorphism
- **Theme:** Light and dark mode support (class-based toggle via `darkMode: ['class']`)
- **Brand color:** Violet #5E6AD2 (HSL 238 58% 58%) — used sparingly for primary actions, focus rings, and active states
- **Palette philosophy:** Near-whites, soft grays, and the brand violet. Color is reserved for meaning (status, priority, provider identity) — never decoration

### Design Principles

1. **Clarity over cleverness** — Every label, icon, and layout choice should reduce cognitive load. If a user has to think about the UI, it failed.

2. **Quiet until relevant** — Default states are calm and muted. Color, weight, and motion appear only when they carry meaning (errors, active states, status changes).

3. **Density without clutter** — Power users need information-rich views. Achieve density through precise typography, tight spacing scales, and consistent alignment — not by cramming elements together.

4. **Systematic consistency** — Use the established token system (HSL variables, radius scale, shadow tiers, type scale from 11px–20px). Every new element should feel like it was always part of the system.

5. **Accessible by default** — Maintain WCAG AA contrast ratios. Support reduced motion preferences. Ensure all interactive elements have visible focus states using the brand violet ring.

### Design Tokens Reference

| Category | Key Values |
|----------|-----------|
| **Fonts** | Inter (sans), JetBrains Mono (mono) |
| **Type scale** | 11px / 12px / 13px / 14px / 16px / 18px / 20px |
| **Radius** | 4px (sm) / 6px (md) / 8px (lg) / full |
| **Shadows** | soft (1px), elevated (4px), float (8px) |
| **Transitions** | 150ms default, 200ms for larger elements |
| **Spacing** | 4px base unit (Tailwind default scale) |
| **Primary** | HSL 238 58% 58% (#5E6AD2) |
| **Destructive** | HSL 358 68% 57% (#E5484D) |
| **Border** | HSL 0 0% 92% — near-invisible |
