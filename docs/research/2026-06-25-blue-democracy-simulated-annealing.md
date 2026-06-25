# Random selection by simulated annealing (Center for Blue Democracy)

Processed 2026-06-25. Relevance: directly informs Allotment's `selection_core` and the Audit step.

## Source

- Paper: Gerwin, M., Szuca, P., Mrozek, N., Kuriata, G., Pospieszna, P., & Geisler, A. M. (2025). "Designing the Process of Random Selection of Citizens' Assemblies." *Journal of Sortition* 1(1), 48-59. DOI 10.53765/3050-0672.1.1.48. PDF: https://bluedemocracy.pl/wp-content/uploads/2025/01/Simulated-Annealing_JoS.pdf
- Landing page + tool ("Sortition Magic", an R script): https://bluedemocracy.pl/random-selection/
- Explainer: https://bluedemocracy.pl/explainer-why-use-simulated-annealing/
- Open data + scripts (10 case studies, comparison harness): https://osf.io/nszft/

License/availability: Sortition Magic is a free, **MIT-licensed** ZIP download (license stated in its ReadMe); data and scripts are open on OSF. Metrics and the evaluation function are trivial to port to Python; the R code itself is not directly reusable. The 8.6 source was inspected locally on 2026-06-25 and then deleted (IDE cruft + a third party's Geneva dataset; not for the public repo). Implementation specifics below are from that read.

## The core fork it exposes

Two credible schools for the second-stage stratified draw, optimizing different objectives:

- **Fairness-first (leximin family)** — what Allotment does. Set quota *ranges* (min/max per category), then maximize the minimum selection probability so chances are as equal as possible. This is the Flanigan et al. (*Nature*, 2021) line that **Panelot** (Sortition Foundation) implements; Allotment's maximin is leximin level 1 of exactly this (see #6). Errors on infeasible quotas; never silently relaxes.
- **Accuracy-first (this paper)** — give *desired exact proportions*; Generalized Simulated Annealing (GenSA in R) searches for the panel that deviates least. No feasible-range tuning needed, and it degrades gracefully to "closest possible" instead of failing.

The paper's own Lausanne case vindicates the fairness-first choice: forcing simulated annealing to find only perfectly-accurate panels collapsed the feasible set to 2 panels and dropped inclusiveness to 38% (most volunteers had zero chance). That is exactly the failure leximin/maximin is built to prevent. This is not a "switch solvers" paper.

## Two metrics worth adopting (algorithm-agnostic)

Defined per draw, summed over every subcategory `s` (e.g. age 25-39), where `desired_s` is the ideal seat count and `actual_s` is the drawn count:

- **Accuracy Index** = `sum_s | desired_s - actual_s |` — total seat deviation. 0 = perfect composition.
- **Closeness Index** = `sum_s | desired_s - actual_s | ^ 1.6` — same deviations, but the 1.6 exponent penalizes a few large misses more than many small ones (so "4 seats off in one group" scores worse than "1 off in four groups"). Lower is better.
- Their solver's evaluation function uses `^2`; the reporting index uses `^1.6` (a "moderate" penalty curve they chose deliberately).
- Confirmed against the 8.6 source: `Accuracy = sum |value - count|` and `Closeness = sum |value - count|^1.6`. The optimizer minimizes `sum( priority * (count - value)^2 )`, where each category carries an optional **priority weight** (default 1) so some categories can be made to matter more.

These are *reporting* numbers, independent of how the panel was drawn. Allotment currently surfaces the equality side (realised selection probabilities) but never quantifies how representative the drawn panel is.

## Method + headline results

- GenSA (Tsallis-Stariolo generalized SA), 10,000 draws per case, 10 real case studies (Geneva 30/360, Lausanne 20/55, Kraków 60/564, Miskolc 50/420, etc.). Benchmarked against Panelot.
- SA matched or beat Panelot on accuracy/closeness in all cases; reached perfect composition (both indices 0) in 6/10.
- SA generated far more unique panels (up to 10,000 of 10,000 in 8/10 cases) vs Panelot's max of 750 (Panelot duplicates a small unique set to equalize probabilities).
- Panelot had slightly better Gini (equality of chances; avg 3.46% lower); SA had better standard deviation in 9/10.
- Real tension: accuracy vs inclusiveness/equality. Chasing perfect accuracy can shrink the pool of valid panels and exclude volunteers. Both methods can reach the same closeness *if* Panelot is fed the right min/max setting; SA's advantage is finding that setting automatically from desired targets.

## Takeaways for Allotment (ranked)

1. **Add Accuracy + Closeness indices to the Audit step.** Highest value, low effort, algorithm-agnostic. Concrete representativeness number to publish next to seed/hash. Fits the "show the work as reassurance" principle. → tracked as #18.
2. **Use the OSF corpus as an eval/benchmark.** 10 case studies + Panelot comparison; since Allotment is in Panelot's family, running them validates `selection_core` and benchmarks against published numbers. → #19.
3. **UX critique of the quota model.** Requiring users to set min/max ranges pushes the hard problem onto the user. An optional "give target proportions, find the closest feasible composition" mode would suit the non-technical organizer. Idea, not a rewrite. → #20.
4. **Positioning / prior art.** Name the fork in the design spec / README (leximin vs accuracy-first SA), showing Allotment's objective was chosen deliberately. Strengthens §16. → #21.

## Implementation notes (Sortition Magic 8.6 source)

Ground truth from reading the R script (`Simulated annealing 8.6 script.R`), now deleted:

- **Input schema (categories file):** one row per `(category, feature)` with a target `value` (the required seat *count*, not a min/max range) and a `priority` weight (default 1). This is the concrete shape for an accuracy-first target-proportions mode (#20), and the priority weight is a capability Allotment's min/max quotas lack.
- **Constraints are soft penalties, not hard rules:** a duplicate person, or (optionally) two people sharing a `HOUSEHOLD_ID`, returns a huge penalty (`99999999`) so the optimizer avoids them. Household de-duplication is a real feature Allotment does not have.
- **Richer reporting menu** than accuracy/closeness alone: Gini index, standard deviation, a custom "Total Equality Index" (normalised sum of deviations from the mean selection count), inclusiveness (% of the pool drawn at least once), unique-panel count, geometric mean, median, and a ten-percent-interval breakdown. A useful menu when expanding the Audit step (#18).
- **Reproducibility:** GenSA *is* seedable (`SA_seed`), so a single draw can be reproducible — but the multi-draw loop reseeds with a fresh random initial sample each draw, and reproducing any draw needs the seed *plus* the initial state *plus* the exact GenSA version. More fragile than the LP's `(input_hash, seed)`.

## What NOT to do

Do not adopt simulated annealing as the solver. Allotment's exact LP (PuLP/CBC) is deterministic and reproducible, which underpins the whole "re-run gives a byte-identical result" verifiability claim (#13). GenSA is seedable, but reproducing a draw depends on the seed plus the random initial state plus the exact solver version, which is more fragile than the LP and would complicate verifiability for no objective Allotment is trying to optimize.

## Should Allotment offer both approaches? (architecture decision)

No, and "offer both" is the wrong frame. The draw has two **separable layers**:

1. **Composition** — the panel's demographic mix (accuracy: deviation from target proportions).
2. **Fairness of chances** — given an acceptable composition, who is selected and with what probability (leximin: maximize the minimum individual selection probability).

The two methods each optimize one layer and neglect the other. Leximin makes composition a *constraint* (min/max ranges) and fairness the *objective*. Accuracy-first SA makes composition the *objective* and lets fairness emerge from stochasticity (hence Panelot's better Gini). They are layers, not rival algorithms, so shipping both would mean shipping two tools that each do half the job and ask the organiser which half to sacrifice.

**No second solver is needed.** Stratified selection with linear quotas is an LP, exactly solvable at these scales; SA buys nothing and would fork the reproducibility story (#13) into a second, fragile audit path. The only genuine architectural fork is the **infeasibility contract**: ours raises (422, never relaxes); accuracy-first always returns the closest panel. Closest-fit is a soft-constraint / goal-programming LP objective (still an LP, not SA), and it is exactly what collapsed inclusiveness in the Lausanne case, so it is a deliberate opt-in, not a default.

**Synthesis — one engine, lexicographic pipeline:**

1. Take target proportions from the user (accuracy-first ergonomics; #20).
2. Stage 1: minimise composition deviation (the Closeness number; #18).
3. Stage 2: among panels within a tolerance of that minimum, run leximin to equalise chances.
4. Expose the tolerance as one honest dial: tight = maximum accuracy, fewer feasible panels, lower inclusiveness; loose = more inclusiveness, looser composition.

This delivers accuracy-first input, graceful degradation, and fairness-first chances in one reproducible LP, with the accuracy-vs-inclusiveness tension on a single defensible slider rather than hidden behind a mode switch. It is #6 (full leximin) and #20 (target input) converging, not two features. Ours is not simply "better"; it optimises the layer that is harder to bolt on later (fairness) and the one that is reproducible.

## Related

Allotment issues #6 (full leximin), #13 (verifiable lottery). README §16 prior-art.
