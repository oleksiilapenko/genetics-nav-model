# Genetics self-assessment prototype notes

This prototype is intentionally static vanilla HTML/CSS/JS. It can be opened directly in a browser and does not require React, npm, a build step, or external dependencies.

## What this iteration is testing

- A record-first family-history model rather than a generated-screen model.
- Section review pages as management surfaces for repeatable relatives.
- A final family-history hub with completion, approximation, and possible age-conflict signals.
- Dynamic "other blood relatives with cancer" options based on relatives already entered.
- Figma-aligned form styling without trying to overdesign missing review/hub screens.

## Important product decision

Screens collect information. Relative records hold information.

A count answer creates initial records, but the records persist independently after that. Changing a count later should not silently delete a relative. The review page owns add/change/remove behavior.

## Internal IDs

Patient UI should not show pedigree IDs, but records carry IDs under the hood to make later mapping easier:

- Fixed relatives: `M`, `F`, `MGM`, `MGF`, `PGM`, `PGF`
- Siblings: `S1`, `S2`, etc.
- Children: `C1`, `C2`, etc.
- Maternal aunts/uncles: `MA1` / `MU1` when sex is known, otherwise `MP1`
- Paternal aunts/uncles: `PA1` / `PU1` when sex is known, otherwise `PP1`
- Other relatives: `GC1`, `GGC1`, `N1`, `GN1`, `FC1`, `GA1`, `GGP1`

These are prototype IDs only. The production team should marry them to the existing backend model later.

## Other blood relatives

The type selection is dynamic:

- Grandchild requires at least one child.
- Great-grandchild requires at least one grandchild already added.
- Niece/nephew requires at least one sibling.
- Grand-niece/grand-nephew requires at least one niece/nephew already added.
- First cousin requires at least one maternal or paternal aunt/uncle.
- Grand-aunt/grand-uncle and great-grandparent are available because grandparents are fixed required relatives.

Each selected type asks for an anchor relative so the eventual pedigree can be derived without asking the patient for clinical relationship-degree language.

## Review and validation

This prototype flags:

- Missing year of birth.
- Missing living status.
- Missing cancer answer.
- Missing sex where sex is asked.
- Diagnosis age missing when a cancer type is entered.
- Possible parent/child age conflicts when both YOBs are known and the difference is less than 12 years.

The real product can apply the existing approximation rules, such as using current age if under 59 and 60 if equal or older when diagnosis age is blank. This prototype only surfaces that an approximation would be needed.

## Known copy/style flags from Figma inspection

- One parent screen showed `Paternal Grandmother` with lead text for `mother's mother`; keep as a copy flag until the final form copy is provided.
- YOB hint punctuation differs across screens: some use a semicolon, sibling uses a dash.
- Older screenshots included DOB fields, but this module should consistently use YOB/YOD.
- Cancer detail branching, including bilateral breast cancer fields, is deliberately simplified for this navigation/review iteration.

## Local usage

Open `index.html` directly in a browser.

The prototype stores progress in `localStorage`. Add `?reset=1` to the URL to clear saved data.
