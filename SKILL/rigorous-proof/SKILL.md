---
name: rigorous-proof
description: Produce a rigorously audited, gap-free proof of a mathematical statement (theorem, lemma, conjecture, inequality, operator/matrix/spectral-set result) and return it as one compilable LaTeX file. Use when the user asks to "prove / show / establish" a result, wants a "rigorous / standalone / complete proof", asks "is this proof correct" or "find the gap", or hands you a theorem and demands a proof that survives adversarial audit. Not for numeric computation, plotting, or code — this skill is for mathematical argument and its verification.
version: 1.0.0
metadata:
  category: math
  created_by: agent
---

# Rigorous proof (adversarial search)

Turn a mathematical statement into a complete, gap-free proof, audited by adversarial passes, and delivered as one compilable LaTeX file. This skill exists to kill the two ways a proof attempt fails silently: returning a **reduction** dressed up as a proof, and returning a **handwaving** argument dressed up as a proof.

## Definition of done

A proof is done only when it is **complete**: every step is justified from the stated hypotheses or an already-proved step; no step assumes the claim or a statement equivalent to it; and the final line is exactly the claim to prove. The following never count as done:

- a reduction to another unproved conjecture;
- a fixed-parameter computation or numerical check;
- a candidate counterexample without a verified certificate;
- a lemma equivalent in strength to the target (that only moves the problem);
- "the rest is routine", "clearly", or a "standard estimate" left underived.

If the search is exhausted and only a partial result survives, report the **strongest rigorously proved derivation and the exact remaining gap**. A vague "best effort" summary is not a deliverable.

## Workflow

### 1. Pin the statement

Restate the theorem with every quantifier, domain, and definition explicit: field, dimension, norm, region, and what each symbol means. Record the exact claim and exact hypotheses. If the statement is ambiguous, list the interpretations, pick the one the user's wording most directly states, and note the assumption in the LaTeX preamble. Do not silently weaken or strengthen the claim.

### 2. Dispatch a diverse portfolio

Launch sub-agents in parallel, each on a genuinely different formulation. Do not tell most agents which approach you currently favour — preserved independence keeps them from converging on one attractive but incomplete reduction. Seed from the approach families below; each agent must return concrete lemmas, constructions, equations, or a counterexample to a proposed sublemma, never a status report or optimism.

### 3. Keep an approach registry

Group every running agent by the **mathematical idea** it uses, not by wording. When several agents converge on one family, redirect the extras toward underexplored formulations. Do not let one family dominate merely because it gives elegant reductions.

### 4. Adversarial audit

Every candidate proof passes an adversarial check that hunts for: gaps (unjustified steps), conditionals (implicit assumptions beyond the hypotheses), handwaving (non-derived "routine" claims), and circularity (any use of a statement equivalent in strength to the target). A proof survives only when no such objection stands.

### 5. Block theorem-strength lemmas

A route that stalls at a lemma equivalent in strength to the original problem is **blocked**. Reopen it only when someone proposes a materially new mechanism, invariant, or construction — not a restatement of the same idea.

### 6. Iterate, then cross-pollinate

Keep several incompatible routes alive across rounds. Cross-pollinate ideas only after independent agents have developed them far enough to expose their real strengths and gaps. Loop back to step 2 with new formulations and redirected agents; do not stop after the first wave fails.

### 7. Write and deliver

Write the surviving proof as one self-contained, compilable `.tex` file (amsmath/amssymb as needed). Re-read it against the definition of done before returning.

## Approach families

Seed the portfolio from these; add more as the problem suggests.

| Family | Idea | Typical tools |
|---|---|---|
| Algebraic | factor or decompose the object | eigenvalues, SVD / Schur / Jordan forms, block structure |
| Analytic | treat the object through functions of it | holomorphic functional calculus, Cauchy estimates, maximum-modulus principle |
| Geometric | work from a convex or geometric picture | numerical range geometry, support functions, convexity |
| Operator / extremal | embed into a larger or simpler structure | dilation, von Neumann inequality, compressions, contractions |
| Sharp / constructive | locate where the bound is tight | extremal examples, rank-one reductions, equality cases |

## Audit checklist

Run on every candidate before accepting it:

- Does any step assume the conclusion, or a statement equivalent to it?
- Is every bound derived, not asserted?
- Are the hypotheses used exactly where stated — no hidden assumptions?
- Does the final line match the claimed statement verbatim?
- Would the same argument prove a false statement? (a reliable gap detector)
