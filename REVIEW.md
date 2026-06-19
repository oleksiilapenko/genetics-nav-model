# Prototype review — issues log

Holistic review of `app.js`, `styles.css`, `index.html`. Logged 2026-06-18.
Severity order: clinical data correctness → functional bugs → accessibility → copy → states → cleanup.
Nothing in this list has been fixed yet.

## Clinical data correctness (highest priority — cancer-risk intake)

1. **Diagnosis age not sanity-checked against lifespan or present day.** `validateDiagnoses` (app.js:1522) only bounds 0–125. Allows "born 1980, died 2000, diagnosed at 50", or proband (born 1983) "diagnosed at 70" (future). No cross-field check.
2. **Proband↔children age conflicts never detected.** `assignGroupPedigree` (app.js:649) gives children `{parent, otherParent}`, but `inferredParentsFor` (app.js:1278) only reads `.father`/`.mother`. A child "born before" the proband is never flagged. `parentIds` schema is inconsistent across types (`father/mother` vs `parent/otherParent` vs `knownParent` vs `sharesParentsWith` vs `parentOf`); only the first is validated.
3. **Proband has no `pedigreeId`.** Children reference parent `"P"`, resolving to nobody (`findPersonByPedigreeId`, app.js:1367). Data-model gap behind #2.
4. **Age-conflict check is one-directional and narrow** (`ageIssuesForPerson`, app.js:1262): only flags parent-younger-than-child by <12. No upper bound, no death-before-diagnosis, no diagnosis-after-death.

## Functional bugs

5. **"More" count accepts invalid input → silent data loss.** Stepper `<input>` (app.js:543) is freely typeable; `startRepeatGroup` (app.js:562) does `Number(value||6)`. "abc" → `NaN` → zero items but `has:"Yes"`. "0" → same. No validation on typed value.
6. **Duplicate diagnosis-row IDs after remove-then-add.** `addDiagnosisRow` (app.js:1121) sets `index = current row count`. Add two (0,1), remove first (leaves 1), add again → new row also index 1 → colliding `id`/`for`/error-slot IDs. Reachable with two rows.

## Accessibility (WCAG 2.2 mandatory per CLAUDE.md)

7. **Two parallel error systems, one inaccessible.** Person fields use `.field-error` + `role="alert"` (app.js:1423) — good. Gates/count/relative-type use older `.error` div (app.js:480, 546, 743, 803) with no `role`/`aria-live` and no focus move — screen readers never announce them, and no red icon/border styling. Unify on `.field-error`.
8. **"More" count input has no label** (app.js:543) — SR reads an unnamed number field.
9. **`lang="en"` should be `en-GB`** (index.html:2) given British-English copy.

## Copy / editorial (plain, reading age 9–11, no jargon)

10. **"YOB" jargon shown to patients** — tags "YOB missing" (app.js:1244), lifespan "YOB not added" (app.js:1224), anchor "YOB 1958" (app.js:1381). Use "Year of birth".
11. **Diagnosis question grammatically broken:** "What type of cancer you had and how old you were when diagnosed?" (app.js:1087). No inversion. Both proband and relative variants.
12. **Review tags too clinical for patients:** "Diagnosis age will need approximation" (app.js:1254), "Possible parent/child age conflict" (app.js:1270), terse "Sex missing"/"Cancer answer missing" (app.js:1247).
13. **Terminology mismatch:** Other-relatives gate lists "great-aunts or great-uncles"/"grandnieces" (app.js:733), but type picker says "Grand-aunt or grand-uncle"/"Grand-niece" (app.js:189). Pick one (UK English favours "great-aunt").
14. **Spaced hyphens used as dashes** (app.js:83, 85, 738, 1382) — inconsistent with the en dash in `lifespanText`.
15. **"Remove this cancer"** (app.js:1116) — removing a record, not a cancer; "Remove this diagnosis" reads better.

## Missing states / interactions

16. **Cancer-type `<select>` says "Type to search…"** (app.js:1107) but is a native dropdown — can't type to search. Make it a real combobox or change the placeholder.
17. **"Other cancer" has no free-text follow-up** (app.js:13, 1106) — captures nothing specific. Same for "Not sure" as a storable type.
18. **Cousins/nieces unreachable if linking relatives not enumerated.** `availableOtherTypes` (app.js:809) hides any type with no anchors — "no aunts/uncles added" means "can't record an affected first cousin", which real families have.
19. **Native `alert()`/`confirm()`** at start dead-end (app.js:380), removals (705, 912), completion (958) — unstyled; no styled confirmation pattern.
20. **`init()` always restarts at the proband screen** (app.js:225) even when saved state exists — mid-flow refresh keeps data but drops you at the start.

## Minor / cleanup

21. **Dead CSS:** `.tag.ok` (styles.css:527, green tags removed); `.inline-actions` (styles.css:462) and `.quick-nav__heading` (styles.css:743) unused.
22. **Hub Back button** always goes to `renderOtherReview()` (app.js:957); when "No" was answered for other relatives it lands on an empty review never opted into.
23. **`MIN_PARENT_AGE = 12`** (app.js:10) — confirm intended clinical threshold vs ~16.

---

### Suggested fix order (load-bearing first)
- #1, #2, #5, #7 — clinical validity, data loss, mandatory a11y gap.
- Then copy (#10, #11, #13, #14) and states (#16, #17).
- Cleanup (#21–#23) last.

---

## Decisions & status (2026-06-18)

**Done (copy batch):**
- #11 — diagnosis question rephrased as proper questions; relative variant kept generic ("they").
- #12 (partial) — "Diagnosis age will need approximation" → "Age at diagnosis missing". Conflict-tag wording handled with #2.
- #13 — terminology aligned to "great-aunt/great-uncle" and "great-niece/great-nephew" across gate list + type picker.
- #14 — spaced hyphens used as dashes replaced with en dashes (gate/count leads, other-gate, anchorLabel).
- #16 — cancer-type `<select>` placeholder "Type to search…" → "Select a cancer type" (icon/combobox to come later, see #17).
- #19 — dev-copy alerts rewritten ("You're at the start of the assessment.", end-of-prototype message); confirms left as-is (already user-appropriate); dialogs stay native.

**No change (by decision):**
- #10 — KEEP "YOB". Review/hub is a shortened clinical-referral summary, not patient-facing; abbreviation is acceptable clinician shorthand.
- #23 — KEEP MIN_PARENT_AGE = 12. Even simpler in the real product.
- #17 — Dropdowns are out of scope; user will supply better content + design. **REMINDER: revisit cancer-type input (combobox/icon) when the user provides the new spec.**

**Done (logic):**
- #2 — age conflicts now detected across all real parent→child edges (`parentChildEdges`), including proband→children (resolved via pedigree id "P") and "other" relatives via their anchors. Non-blocking amber "Check birth years" flag shown on BOTH the child's and the parent's review rows; rolls up to "X items to check" at section/hub level. Conflict tag changed danger→warn. `.tag.danger` CSS now unused. Future "open parent" jump: advised (reuse existing Change editors + a returnTo ref; only show for real—non-synthetic—parents).
- #12 (conflict tag) — "Possible parent/child age conflict" → "Check birth years".

**Done (2026-06-19):**
- #5 — count screen rebuilt to match Figma (node 21976-223742). Two states: pills `1 2 3 4 5 More` in one tight row (gap 12px, pill min-width 56px, no wrap on desktop); clicking "More" *switches mode* — pills are replaced by the +/- stepper (grey rounded-square buttons + bordered centred input), not stacked below. No reset affordance (by decision). `renderCount` now branches on `selected === "more"` and renders only one control.
- #8 — count "More" input now has an sr-only `<label for>`.
- Year spinners — native number-input spinner arrows removed flow-wide via `input[type="number"]{appearance:textfield}` + `::-webkit-*-spin-button{appearance:none}`. Note: `input[type="number"]` has specificity (0,1,1) — beat the global width rule for `.stepper-input` by selecting `input.stepper-input`.

**To do (separate turns):**
- #18 — make cousins/nieces reachable even when linking relatives weren't enumerated (fallback anchor / don't hide types).
- #22 — hub Back should not land on an empty other-relatives review.

**Deferred (assess later, not now):**
- #4 — death-before-diagnosis check (feasibility noted; address later).

---

## Brainstorm — review & hub screens (2026-06-19)

### A. Unresolved major issues (ranked)

Clinical / data integrity:
- **#4 (deferred)** death-before-diagnosis / diagnosis-after-death never checked. Single-record check: `birthYear + diagnosisAge` vs `yearOfDeath`. Amber, non-blocking.
- **#1** diagnosis age not sanity-checked vs lifespan or present day (e.g. diagnosed in the future, or after death). Cross-field, currently only bounded 0–125.
- **#2 follow-through** age-conflict now flags both rows, but there's still no "jump to the parent" affordance from a child row, and the `parentIds` schema is still inconsistent across relationship types (only some keys are walked by `parentChildEdges`).
- **#6** duplicate diagnosis-row IDs after remove-then-add (index = row count) → colliding `id`/`for`/error-slot IDs. Reachable with two rows.

Functional / flow:
- **#18** cousins/nieces unreachable when their linking relative (aunt/uncle) wasn't enumerated — real families have affected first cousins with no recorded aunt/uncle. `availableOtherTypes` hides any type with no anchors.
- **#22** hub Back can land on an empty other-relatives review that was never opted into.
- **#5 NaN guard** count "More" input still does `Number(value||6)`; with the stepper-only entry this is now hard to hit, but typed "0"/"abc" should still be guarded in `startRepeatGroup`.
- **#20** `init()` always restarts at the proband screen even with saved state — mid-flow refresh keeps data but drops you at the start.

A11y / copy / cleanup:
- **#7** two parallel error systems; gates/count/relative-type still use the older `.error` div (no `role`/`aria-live`, no focus move). Unify on `.field-error`.
- **#9** `lang="en"` → `en-GB`.
- **#21** dead CSS: `.tag.ok`, `.tag.danger` (now unused after #2), `.inline-actions`, `.quick-nav__heading`.
- **#17 (waiting on spec)** cancer-type native `<select>` → combobox/icon when the user supplies content + design.

### B. How the review & hub can be improved — what to surface, when

Today each row is `title · relationship · sex · lifespan · cancer` + amber tags, with one "Change/Review" action (`reviewRow`, app.js:1173; `personMeta`, app.js:1207).

Proposed direction:
1. **Lead with the human relationship, demote the raw fields.** Row title becomes the friendly name (see C); the meta line carries the clinical shorthand (YOB, lifespan, dx). Keeps it a clinician-readable referral summary while making the family structure scannable.
2. **Surface *why* a row needs attention, inline and specific.** Replace generic "X items to check" rollups with the actual reason on the row ("Birth year missing", "Check birth years vs mother", "Age at diagnosis missing"). The hub rollup stays as a count but each section opens to specifics.
3. **Make conflict tags actionable.** A "Check birth years" tag on a child row should offer a direct jump to the *parent* it conflicts with (reuse existing Change editors + a `returnTo` ref; only for real, non-synthetic parents). This is the #2 follow-through.
4. **Show completeness, not just problems.** A small per-section progress signal ("4 of 5 added", "all complete") so the user knows what's left before submit, rather than only seeing amber when something's wrong.
5. **Group the hub by side of family** (You / Mother's side / Father's side / Other) to mirror the pedigree mental model and make a long list navigable.
6. **Order rows meaningfully** (by generation, then birth year) instead of entry order, so the summary reads like a family tree.
7. **Surface affected relatives first / visually distinct** — for a cancer-risk tool, rows with a reported diagnosis are the clinically important ones and should stand out from "no cancer reported" rows.

When to surface what:
- *During entry*: only validate the field in front of the user (don't pre-flag empty future screens).
- *At each section review*: per-person specifics + what's still missing in that section.
- *At the hub (pre-submit)*: rolled-up counts per section, affected relatives summarised, and a clear "what's incomplete" list gated before the final submit.

### C. Human-friendly relative naming

Data available per person: `relationship` (e.g. "Sibling", "Child", "Maternal aunt/uncle", "Niece or nephew") + `sex` ("Female"/"Male"/blank). Fixed relatives already carry proper titles (Mother, Father, Maternal grandmother…). Map `relationship × sex → friendly term`:

| relationship | Female | Male | sex unknown |
|---|---|---|---|
| Sibling | Sister | Brother | Sibling |
| Child | Daughter | Son | Child |
| Maternal aunt/uncle | Aunt (mother's side) | Uncle (mother's side) | Aunt or uncle (mother's side) |
| Paternal aunt/uncle | Aunt (father's side) | Uncle (father's side) | Aunt or uncle (father's side) |
| Grandchild | Granddaughter | Grandson | Grandchild |
| Great-grandchild | Great-granddaughter | Great-grandson | Great-grandchild |
| Niece or nephew | Niece | Nephew | Niece or nephew |
| Great-niece or great-nephew | Great-niece | Great-nephew | Great-niece or great-nephew |
| First cousin | Cousin | Cousin | Cousin |
| Great-aunt or great-uncle | Great-aunt | Great-uncle | Great-aunt or great-uncle |
| Great-grandparent | Great-grandmother | Great-grandfather | Great-grandparent |

Implementation: a single `friendlyRelation(person)` helper, used as the `reviewRow`/`hubRow` title (falling back to `person.name` if the user typed a real name, then to this map, then to the current generic label). 
Disambiguation when there are several of the same kind: append a distinguisher the user will recognise — name if present, else birth year ("Brother (b. 1979)"), else an ordinal ("Brother 2"). Prefer birth year over bare ordinals.
Keep `relationship` + `sex` in the meta line so the clinical referral still shows the precise terms.
