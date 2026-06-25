# Product

## Register

product

## Users

Civic-tech facilitators, assembly organizers, and local-government or nonprofit staff who run online citizens' assemblies, juries, and review panels. They are often non-technical, they self-host or use a shared reference instance, and they need to run a credible, defensible lottery without being statisticians. They are usually mid-task: they have a candidate pool and a deadline, and they want to reach a trustworthy selected panel and hand it off.

A second, critical audience is the auditor or skeptic: a participant, journalist, or oversight body who needs to trust that the draw was fair and, in principle, reproduce it.

## Product Purpose

Allotment runs the fair, auditable sortition draw that grounds the legitimacy of an online citizens' assembly. It owns the selection layer only: import a pool, set stratification quotas, run a reproducible lottery (maximin fair selection under a published seed), review the result and its audit record, then hand the cohort to a deliberation tool (Harmonica) or export it.

Success is an organizer who trusts the result enough to defend it in public, and a skeptic who can check it. It is open-source civic infrastructure, self-hostable, AGPL-3.0.

## Brand Personality

Calm and approachable. Three words: warm, clear, trustworthy.

It demystifies a process (random selection for democracy) that sounds arcane, so a non-expert organizer feels capable and a participant feels respected. The voice is plain-spoken and human, never jargon-first; it explains rather than impresses. Confident but unintimidating: the gravitas comes from clarity and honesty, not institutional coldness. Where it shows its work (seeds, hashes, probabilities) it does so reassuringly, as proof you can trust, not as a wall of math.

## Anti-references

- **Not a generic SaaS dashboard.** No tool-blue plus Inter plus identical cards; not a Linear/Stripe clone.
- **Not a flashy voting or crypto app.** No neon, gradients, gamification, or "web3" energy.
- **Not a cold government portal.** Not bureaucratic, dated, or form-heavy; not a gov-portal-gone-wrong.
- **Not sterile or clinical.** No hospital-white, no absence of warmth or point of view.

The throughline: avoid both the slick-corporate pole and the cold-institutional pole. Allotment should feel like a humane civic tool made by people who care, not a product and not a bureaucracy.

## Design Principles

1. **Demystify, don't impress.** Every screen should make sortition feel understandable; plain language beats clever terminology. Define a term the first time it appears.
2. **Show the work as reassurance.** The audit trail, seed, and probabilities are the product's trust claim. Present them as legible proof, warmly, not as intimidating technical exhaust.
3. **Warmth with credibility.** Approachable and human, but never flimsy; an organizer must be able to defend the result. Calm confidence over both hype and coldness.
4. **The draw is a deliberate act.** The lottery is the legitimacy moment; running it should feel intentional and considered, never incidental.
5. **Earn trust through honesty.** Name limitations, surface warnings plainly, never hide what the system did or did not do.

## Accessibility & Inclusion

Target WCAG 2.1 AA. Honor `prefers-reduced-motion` (already wired). Never rely on color alone to convey state; pair it with icons or text (quota fill, alerts). Hold AA contrast on the warmer palette, watching warm neutrals behind body text. Keep everything keyboard-operable (the wizard, the upload zone, the quota builder). Plain language supports non-native readers and cognitively loaded users.
