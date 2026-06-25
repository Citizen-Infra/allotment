# Random selection by simulated annealing (Center for Blue Democracy)

Processed 2026-06-25. Relevance: directly informs Allotment's `selection_core` and the Audit step.

## Source

- Paper: Gerwin, M., Szuca, P., Mrozek, N., Kuriata, G., Pospieszna, P., & Geisler, A. M. (2025). "Designing the Process of Random Selection of Citizens' Assemblies." *Journal of Sortition* 1(1), 48-59. DOI 10.53765/3050-0672.1.1.48. PDF: https://bluedemocracy.pl/wp-content/uploads/2025/01/Simulated-Annealing_JoS.pdf
- Landing page + tool ("Sortition Magic", an R script): https://bluedemocracy.pl/random-selection/
- Explainer: https://bluedemocracy.pl/explainer-why-use-simulated-annealing/
- Open data + scripts (10 case studies, comparison harness): https://osf.io/nszft/

License/availability: Sortition Magic is a free ZIP download; data and scripts are open on OSF. Metrics and the evaluation function are trivial to port to Python; the R code itself is not directly reusable.

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

These are *reporting* numbers, independent of how the panel was drawn. Allotment currently surfaces the equality side (realised selection probabilities) but never quantifies how representative the drawn panel is.

## Method + headline results

- GenSA (Tsallis-Stariolo generalized SA), 10,000 draws per case, 10 real case studies (Geneva 30/360, Lausanne 20/55, Kraków 60/564, Miskolc 50/420, etc.). Benchmarked against Panelot.
- SA matched or beat Panelot on accuracy/closeness in all cases; reached perfect composition (both indices 0) in 6/10.
- SA generated far more unique panels (up to 10,000 of 10,000 in 8/10 cases) vs Panelot's max of 750 (Panelot duplicates a small unique set to equalize probabilities).
- Panelot had slightly better Gini (equality of chances; avg 3.46% lower); SA had better standard deviation in 9/10.
- Real tension: accuracy vs inclusiveness/equality. Chasing perfect accuracy can shrink the pool of valid panels and exclude volunteers. Both methods can reach the same closeness *if* Panelot is fed the right min/max setting; SA's advantage is finding that setting automatically from desired targets.

## Takeaways for Allotment (ranked)

1. **Add Accuracy + Closeness indices to the Audit step.** Highest value, low effort, algorithm-agnostic. Concrete representativeness number to publish next to seed/hash. Fits the "show the work as reassurance" principle. → tracked as #18.
2. **Use the OSF corpus as an eval/benchmark.** 10 case studies + Panelot comparison; since Allotment is in Panelot's family, running them validates `selection_core` and benchmarks against published numbers.
3. **UX critique of the quota model.** Requiring users to set min/max ranges pushes the hard problem onto the user. An optional "give target proportions, find the closest feasible composition" mode would suit the non-technical organizer. Idea, not a rewrite.
4. **Positioning / prior art.** Name the fork in the design spec / README (leximin vs accuracy-first SA), showing Allotment's objective was chosen deliberately. Strengthens §16.

## What NOT to do

Do not adopt simulated annealing as the solver. Allotment's exact LP (PuLP/CBC) is deterministic and reproducible, which underpins the whole "re-run gives a byte-identical result" verifiability claim (#13). SA is stochastic and would weaken that guarantee for no objective Allotment is trying to optimize.

## Related

Allotment issues #6 (full leximin), #13 (verifiable lottery). README §16 prior-art.
