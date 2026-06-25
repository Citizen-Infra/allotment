# Design

## Theme

Light, warm, and calm. The surface is a warm "ballot paper" off-white, not cool grey and not clinical white. One calm moss-green accent carries action and "good/go"; the warmth comes from the neutrals, the credibility from restraint. Scene: a non-technical organizer at a desk in daylight, getting a defensible draw done without anxiety.

## Color

OKLCH throughout. Restrained product palette: tinted warm neutrals plus a single accent; semantic colors reserved for state. Never color-only — always pair with an icon or text.

### Neutrals (warm, hue ~65–80)
- `--ink` `oklch(0.26 0.018 65)` — primary text
- `--slate-700` `oklch(0.40 0.014 65)` — body / secondary text
- `--slate-500` `oklch(0.50 0.012 68)` — labels, hints
- `--slate-400` `oklch(0.64 0.012 72)` — placeholders, muted
- `--slate-200` `oklch(0.90 0.012 78)` — hairline borders, dividers
- `--surface` `oklch(0.975 0.010 80)` — page background (warm paper)
- `--card` `oklch(0.995 0.006 85)` — card surface (warm near-white, never pure #fff)

### Accent (moss green — action, selection, focus, "go")
- `--accent` `oklch(0.44 0.10 150)`
- `--accent-dark` `oklch(0.38 0.105 150)` — hover, links
- `--accent-dim` `oklch(0.955 0.03 150)` — selected / info / done-step wash

### Semantic
- `--success` `oklch(0.46 0.11 150)` — green family, unified with the accent (good)
- `--warn` `oklch(0.58 0.12 70)` — amber (caution)
- `--danger` `oklch(0.52 0.17 28)` — brick red (stop)
- Each has a light `*-dim` tint for alert backgrounds; alert borders are a mid tint of the same hue.

## Typography

One family: **Hanken Grotesk** (warm humanist sans; replaces Inter), weights 400/500/600/700, plus a monospace stack (`JetBrains Mono`, `ui-monospace`) for seeds, hashes, and IDs.

Fixed scale, 16px base, body `line-height` 1.6:
- h1 28 / 700, h2 20 / 600, h3 17 / 600, body 16 / 400, hint 12–13.
- Hierarchy via size + weight + warm-grey color, not size alone.
- Uppercase micro-labels (stat-label, table head, step-eyebrow) at 11–12px, letter-spacing 0.06–0.1em.

## Components

- **Buttons:** primary (solid moss, white label), secondary (card bg + hairline border), ghost (text-only), success (solid green). 8px radius. Hover deepens the accent; focus uses `--focus-ring` (3px moss wash).
- **Inputs:** hairline border, 8px radius, moss focus ring; select uses a warm-grey chevron.
- **Alerts:** soft tinted background + same-hue border + semantic text + leading icon.
- **Ballot-strip progress track:** the signature element — segmented like a paper ballot, with done (moss wash) / active / upcoming states.
- **Audit block:** monospace "document" treatment for the reproducibility bundle (draw ID, input hash, seed).
- **Cards:** one step-card per wizard step; warm hairline border + soft `--shadow-card`.

## Layout

Single centered column, `max-width` 720px, generous vertical rhythm. Mobile: reduced padding, 2-column stat grid, collapsed quota-target grid. Responsive behavior is structural, not fluid type.

## Motion

~150ms transitions on interactive state (color, background, box-shadow). Honors `prefers-reduced-motion`. Motion conveys state, not decoration (the infinite active-step pulse is slated for retirement in the polish pass).
