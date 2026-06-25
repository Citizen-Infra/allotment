---
status: DRAFT — CIBC blog, pending publication to Substack
source-thinking: docs/research/2026-06-25-blue-democracy-simulated-annealing.md
date: 2026-06-25
---

# Two ways to draw an assembly, and why we built one

Allotment is a small open-source tool that does one job: run the lottery that selects a citizens' assembly. You upload a pool of volunteers, say how the panel should mirror the population, and it draws a representative group at random. We are building it as civic infrastructure, the way the Citizen Infrastructure Builders Club builds everything: self-hostable, auditable, free.

While building it we hit a fork that sits close to the heart of sortition, and the way we resolved it says something about building civic tools in general. So here is the decision, in the open.

## Two tools, two philosophies

There are two respected families of software for drawing an assembly, and they optimize different things.

One family, which includes the Sortition Foundation's Panelot and the algorithm behind Allotment, treats fairness as the goal. You set quotas as ranges, between 14 and 16 people aged 25 to 39, say, and the software finds the draw that comes as close as mathematically possible to giving every volunteer an equal chance of being picked. The technical name is leximin. The plain version is that nobody's lottery ticket is worth more than anybody else's.

The other family, developed by the Center for Blue Democracy in Poland and published last year in the Journal of Sortition, treats accuracy as the goal. You give it the exact demographic mix you want, and it uses a method called simulated annealing to find the panel that matches those targets most precisely. When a perfect match is impossible, it does not fail. It returns the closest panel it can.

Both are credible. Both run real assemblies. When we read the Blue Democracy paper the accuracy-first approach was genuinely attractive: it asks the organizer for the mix they want rather than making them reverse-engineer the right ranges, and it never throws up its hands. So the obvious question was whether Allotment should offer both and let organizers choose.

## The reflex to ship both

Offering both is the default instinct in software. More options, more flexibility, let the user decide. We nearly wrote it down as a roadmap item.

But the longer we looked, the more "two algorithms" turned out to be the wrong way to see it. The two approaches are not really competing to do the same job. Each does one half of the job and leaves the other half alone.

A draw involves two separate questions:

1. What mix should the panel have? (accuracy)
2. Given an acceptable mix, who gets in, and with what odds? (fairness)

Leximin answers the second question beautifully and leaves the first to the user, who has to know the right ranges. The accuracy-first method answers the first question beautifully and barely touches the second; equal odds just fall out of the math, however they happen to. That is not a quirk. In the Blue Democracy team's own results their method was slightly less equal than Panelot on the standard inequality measure, precisely because equal odds were never what it set out to optimize.

So "offer both" would mean shipping two tools that each do half the job well, and asking the organizer to pick which half to sacrifice. That is not a feature. It is handing the user our hardest design decision and calling it choice.

## The tension is real, and it does not go away

Here is the part that settled it. The two goals genuinely pull against each other, and no algorithm escapes that.

In one of the Blue Democracy team's case studies, a 20-person assembly in Lausanne, they pushed their method to find a perfectly accurate panel. It worked. It found panels that matched the targets exactly. But only two such panels existed in the entire pool. Two. Which means almost every volunteer had no chance of being selected at all, and inclusiveness fell to 38 percent.

That is the trade-off in its starkest form. Perfect representativeness and broad equal chances can be physically incompatible when only a handful of panels fit the target. It is not a flaw in anyone's algorithm. It is a property of the situation. Shipping two algorithms does not resolve the tension. It hides it behind a menu and lets each tool fail quietly in its own direction.

If the tension is unavoidable, the honest move is not to pick a side and bury the other. It is to make the trade-off visible and put it in the organizer's hands on purpose.

## One engine, one honest dial

So that is what we are building toward. Not two algorithms, but one, with the trade-off exposed as a single control.

The shape is simple once you stop seeing accuracy and fairness as rivals and start seeing them as steps. First, take the mix the organizer actually wants, in plain terms. Then work out how close to that mix is even achievable. Then, among all the panels that come within a chosen tolerance of that best-achievable accuracy, run the fairness step to equalize everyone's odds as far as possible.

The tolerance is the dial. Turn it tight and you get maximum representativeness, fewer eligible panels, and lower inclusiveness, the Lausanne end of the scale. Loosen it and more volunteers get a real chance, at the cost of a slightly looser match. The organizer sets it, sees the resulting numbers, and can defend the choice in public. Nothing hides in the solver.

This keeps the best of the accuracy-first approach, asking for the mix you want and degrading gracefully when perfection is out of reach. It keeps the fairness guarantee. And it keeps one more thing we were not willing to give up: reproducibility. An Allotment draw can be re-run by anyone from a published seed and produce a byte-for-byte identical result. That is the basis of being able to prove a lottery was not rigged. Simulated annealing, for all its strengths, is far harder to reproduce exactly. Bolting it on as a second engine would have meant maintaining two separate ways to verify a draw, and a weaker guarantee on one of them. For a tool whose whole purpose is trust, that is a bad trade.

## Why this is a civic question, not just an engineering one

It would have been easy to add a second algorithm, label it "accuracy mode," and let people choose. It would have looked like generosity. It would really have been an abdication: handing users a decision we had not done the work to understand, and letting the hardest trade-off in the process vanish into a setting nobody reads.

Civic infrastructure earns trust by being legible, not by being feature-rich. An assembly's legitimacy rests on people believing the draw was fair and being able to check it. That belief is better served by one well-understood method with its trade-off in plain view than by a pile of options that each quietly optimize for something different.

So Allotment runs one algorithm. Not because the alternative is wrong, but because the choice between the two was never really the user's to make blind. It was ours to think through, in the open, and turn into a dial they can actually reason about.

Allotment is open source, and the full reasoning, papers and math included, lives in the project's research notes. If you run assemblies, or build tools for the people who do, we want to hear where this holds up and where it does not.
