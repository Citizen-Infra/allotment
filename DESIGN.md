---
name: Allotment — Open Index
description: Large-type civic forms with a legible, reproducible draw record.
colors:
  page: "#F4F44D"
  surface: "#FFFFFF"
  surface-subtle: "#FFFDD4"
  ink: "#14233A"
  text-secondary: "#253749"
  text-muted: "#3C4B5E"
  border: "#C8CE91"
  control-border: "#53667B"
  action: "#2545EF"
  action-hover: "#1832CA"
  action-active: "#122695"
  selected: "#E2E8FF"
  disabled: "#E8EACB"
  success: "#1E5B3F"
  success-surface: "#E2F1E9"
  success-border: "#3F7C5D"
  warning: "#714300"
  warning-surface: "#FFF1CF"
  warning-border: "#9C6800"
  danger: "#9A2831"
  danger-surface: "#FBE7E7"
  danger-border: "#BC4350"
  info: "#245486"
  info-surface: "#E5EEF9"
  info-border: "#4B75A5"
  data-empty: "#E3EBEF"
  data-high: "#075A70"
typography:
  wordmark:
    fontFamily: '"Public Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(2rem, 1.75rem + 0.7vw, 2.375rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: '"Public Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(2rem, 1.75rem + 1vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: '"Public Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(1.75rem, 1.625rem + 0.3vw, 1.875rem)"
    fontWeight: 600
    lineHeight: 1.1
  body:
    fontFamily: '"Public Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(1.375rem, 1.25rem + 0.5vw, 1.5rem)"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: '"Public Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(1.25rem, 1.2rem + 0.2vw, 1.375rem)"
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: '"Public Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(1.25rem, 1.2rem + 0.2vw, 1.375rem)"
    fontWeight: 400
    lineHeight: 1.4
  record:
    fontFamily: 'ui-monospace, "SFMono-Regular", Consolas, monospace'
    fontSize: "clamp(1.25rem, 1.2rem + 0.2vw, 1.375rem)"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  control: "0.25rem"
  card: "0.75rem"
spacing:
  space-1: "0.25rem"
  space-2: "0.5rem"
  space-3: "0.75rem"
  space-4: "1rem"
  space-6: "1.5rem"
  space-8: "2rem"
  space-10: "2.5rem"
  space-12: "3rem"
  space-16: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1.25rem"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  button-primary-active:
    backgroundColor: "{colors.action-active}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1.25rem"
  button-secondary-hover:
    backgroundColor: "{colors.selected}"
  button-secondary-compact:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.75rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1.25rem"
  button-ghost-hover:
    backgroundColor: "{colors.surface-subtle}"
  button-disabled:
    backgroundColor: "{colors.disabled}"
    textColor: "{colors.text-muted}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1rem"
  step-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "2.5rem"
  progress-current:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    padding: "1rem"
  progress-complete:
    backgroundColor: "{colors.success-surface}"
    textColor: "{colors.success}"
  tag:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.75rem"
  tag-selected:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
  audit-record:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    typography: "{typography.record}"
    rounded: "{rounded.control}"
    padding: "1.5rem"
  alert-error:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.control}"
    padding: "1rem"
  disclosure-info:
    backgroundColor: "{colors.info-surface}"
    textColor: "{colors.info}"
    rounded: "{rounded.control}"
  probability-distribution:
    textColor: "{colors.text-secondary}"
    typography: "{typography.caption}"
  probability-track:
    backgroundColor: "{colors.data-empty}"
  probability-fill:
    backgroundColor: "{colors.data-high}"
---

# Design System: Allotment — Open Index

## Overview

**Creative North Star: "Open Index"**

Allotment makes civic selection approachable through generous type, plain-language explanations and clearly labelled states. Yellow surrounds a white working surface; blue marks action, the current stage and the reproducibility record. Warmth comes from the page field and readable pacing rather than muted text or decorative effects.

This records the completed, user-approved adoption of Open Index (0.2.0-draft.1), pinned to immutable foundation revision `6df5682711d11d1dde20453d0e06a78aca48b34f`. The canonical foundation is `cibc-design-system/tokens.css`; its `guides/adoption.md` defines adoption boundaries. Allotment consumes the pinned dependency's `fonts.css` and `tokens.css` through `ui/src/main.tsx`, then maps its plain-CSS roles in `ui/src/index.css`. This is a light-only application: the foundation's dark palette is not an adopted theme, and there is no new theme preference storage.

**Key Characteristics:**
- Large locally served Public Sans, with monospace reserved for reproducibility values.
- Flat yellow, white and blue fields; semantic feedback remains distinct.
- Explicit sequence and state labels, not colour-only signals.
- Responsive reflow preserves the complete task and its evidence.

## Colors

The foundation's canonical hex palette pairs bright reference fields with dark, legible text; the frontmatter records only colours used by this adapter.

### Primary
- **Index Blue** (`action`): primary actions, selected tags, current progress segment and reproducibility field; white labels on solid blue. Hover and pressed states deepen the blue.
- **Selection Wash** (`selected`): secondary-button hover, upload interaction, selected-state badges and join-link container. Badges and join links use action-hover text; secondary controls retain Reading Slate.

### Secondary
- **Civic Yellow** (`page`): the surrounding page, not a success or warning signal.

### Neutral
- **Working White** (`surface`): the main step card and inputs; also the inverse foreground on solid blue.
- **Pale Paper** (`surface-subtle`): upcoming stages, disclosures, table headers, secondary record fields and quiet hover states.
- **Document Ink** (`ink`): primary text, caret-adjacent reading context and focus outlines.
- **Reading Slate** (`text-secondary`) and **Caption Slate** (`text-muted`): explanatory text, labels and hints; subdued by role, not made tiny.
- **Paper Divider** (`border`) and **Control Slate** (`control-border`): structural rules versus stronger input boundaries.
- **Disabled Paper** (`disabled`): opaque disabled controls with Caption Slate text.

### Semantic and data roles
- **Success Green**: completed progress, success alerts, within-band quota bars and success badges; paired surface and border roles support feedback.
- **Warning Amber** and **Danger Red**: cautions, out-of-band quota states, validation and errors, with corresponding surfaces and borders.
- **Information Blue**: explanatory disclosures and info alerts, separate from the saturated brand field.
- **Distribution Teal** (`data-high`) on **Empty Track** (`data-empty`): probability counts visualized as bars, never a success claim.

**The Brand Is Not Status Rule.** Blue carries action and reference fields; green, amber and red carry outcome meaning, with visible text or icons alongside colour.

## Typography

**Display and body font:** locally served **Public Sans**, with the sans-serif fallback stack in the frontmatter. **Record font:** the platform monospace stack; no separate downloaded mono family.

The fluid roles below assume the browser's normal root size; do not lock the root size to prevent user text enlargement. Headings use compact leading, while body text keeps a generous reading measure (68ch).

- **Wordmark:** bold (700), approximately (32–38px), tightly tracked; the product heading, not a separate display typeface.
- **Headline:** bold (700), approximately (32–36px), for step titles; stat values share the size but inherit body leading.
- **Title:** semibold (600), approximately (28–30px), for subsections.
- **Body:** regular (400), approximately (22–24px), for explanations.
- **UI and captions:** approximately (20–22px); labels and buttons are semibold (600), fields, tags, hints and state descriptions regular (400), progress labels bold (700).
- **Record:** approximately (20–22px), with looser leading (1.6); keep hashes, seeds and IDs complete and wrap them rather than truncating.

**The Readable Detail Rule.** Captions, table text, repeated quota labels and audit values retain the UI-size floor; hierarchy must not depend on microtype.

## Layout

A centered shell has a maximum width (68rem), with desktop padding (3rem 2rem 4rem). Its five-column progress strip precedes one white step surface, padded (2.5rem). Standard forms use two equal columns; statistics use auto-fit columns with a minimum (12rem). Spacing follows the frontmatter rhythm rather than nested decorative cards.

At a maximum viewport width (760px), the shell padding becomes (1.5rem 1rem 3rem), card padding becomes (1.5rem 1rem), forms and statistics stack, and all five progress labels remain visible in a vertical strip. Quota targets become a two-column grid, preserving a visible Feature, Value, Min and Max label in every row. Audit labels stack above their values; navigation and download buttons take full width. At (360px) and below, progress-state text and distribution ranges receive their own rows.

Controls have minimum heights: compact (3rem / 48px), standard (3.5rem / 56px), phone (3.75rem / 60px). These are minimums, not fixed heights: wrapping labels may grow. Containers permit shrinkage and long text wraps; data tables scroll within their own labelled region rather than widening the page.

## Elevation & Depth

Flat fields and borders establish hierarchy. The step surface has no shadow or perimeter border; alerts, inputs and disclosures use explicit boundaries. No overlay-shadow token is adopted merely because the foundation exports one.

Interactive background changes use the fast duration (120ms). Quota bars use the slow duration (240ms) and foundation ease-out. A rotating spinner indicates ongoing work, not progress decoration; reduced-motion preference removes animations and transitions. The progress strip does not pulse.

## Shapes

Controls, disclosures and record blocks have lightly eased corners (0.25rem); the main working surface is rounder (0.75rem). Progress fields, badges and chart tracks are square-edged. Number/check markers and spinners are circular. Borders are ordinarily hairline (1px); the upload affordance uses a dashed boundary (2px). Focus is an ink outline (3px) offset (3px), not a faint brand wash.

## Components

### Buttons and selectable tags
Primary actions are solid blue with white text; the incumbent success-named button variant deliberately uses the same action treatment, not semantic green. Secondary controls are white with a Control Slate border; ghost controls have transparent backgrounds. Hover changes the fill; primary pressed state deepens it. Disabled controls keep opaque, readable colours and a not-allowed cursor. Tags use a bordered white resting state and solid blue selection, with their selection exposed semantically.

### Fields and quota targets
White fields have an explicit boundary, full available width and UI-size text. Invalid number inputs acquire a danger boundary with a readable error message. Each quota row repeats its field labels; reflow must not leave numbers dependent on a distant desktop header. The upload region has a dashed outline, text instructions and keyboard access, with a selection wash on hover/drag.

### Progress and working surface
The existing sequence remains Assembly, Pool, Quotas, Draw and Handoff. The final stage contains Audit and Handoff together, not a new sixth step. Progress is an ordered list rather than clickable shortcuts, with Current, Complete and Upcoming text, `aria-current="step"`, and checks for completed stages. Entering a new stage transfers focus to its main working surface.

### Disclosures and feedback
Native disclosures reveal explanatory copy without changing the sequence; their summaries retain generous targets and visible focus. Info panels use the information palette. Feedback uses the appropriate semantic surface, boundary and text, with meaningful text or icons. Busy actions show a spinner and a changed label; disabled state is not conveyed through opacity alone.

### Reproducibility record and distribution
The blue reproducibility block pairs sans-serif labels with full monospace values, including the published seed and input hash. Copy feedback changes the button label; values wrap within the field. Other audit data remains on Pale Paper.

When probability data is present, its distribution contains all ten ranges (0–10% through 90–100%), including empty buckets. Desktop presents ten vertical bars with explicit counts and ranges; phone layout presents ten horizontal rows with the same range and count. Bars are decorative to assistive technology; the list's text provides the data, including the candidate-count unit. Narrow reflow must not hide buckets or substitute endpoint labels for the full distribution.

## Do's and Don'ts

### Do:
- **Do** use the immutable foundation dependency and local font imports before the application adapter.
- **Do** keep every progress state, quota field and distribution bucket explicitly labelled through reflow.
- **Do** preserve full seed/hash values and allow control labels and containers to grow with enlarged text.
- **Do** pair feedback colour with text or icons and preserve keyboard focus and reduced-motion behavior.

### Don't:
- **Don't** reuse success green as the brand action colour or infer a success state from a blue field.
- **Don't** restore small uppercase micro-labels, pulse the current step or introduce decorative shadows.
- **Don't** silently enable the foundation's dark theme or add theme preference storage.
- **Don't** treat the sidecar's synthesized tonal previews as new application colours or rewrite the pinned foundation locally.
