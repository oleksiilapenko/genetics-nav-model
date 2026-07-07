/*
  Genetics self-assessment prototype

  This is intentionally dependency-free. The UI is a prototype, but the state
  is record-first: relative records persist independently of the screens used
  to create them. Dev-facing mapping notes live in prototype-notes.md.
*/

const STORAGE_KEY = "cts-genetics-nav-prototype-v1";
const MIN_PARENT_AGE = 12;
const PROBAND_BIRTH_YEAR = "1983";

const BREAST_CANCER = "Breast cancer";

// Placeholder list — the real product carries many more types. Only breast and
// ovarian drive the calc for now; the rest are collected, not gated. A skipped
// type is allowed and maps to "Unknown cancer" on the clinician referral, so
// there is deliberately no "Other"/"Not sure" entry here (leave blank instead).
const cancerTypes = [
  "Breast cancer",
  "Ovarian cancer",
  "Bowel cancer",
  "Womb cancer",
  "Prostate cancer",
  "Pancreatic cancer",
  "Lung cancer",
  "Stomach cancer",
  "Kidney cancer",
  "Bladder cancer",
  "Melanoma",
  "Oesophageal cancer"
];

const fixedDefs = [
  {
    id: "mother",
    pedigreeId: "M",
    title: "Biological mother",
    displayTitle: "Your mother",
    lead: "Tell us a few details about your biological mother.",
    sex: "Female",
    group: "Maternal side",
    parentIds: { father: "MGF", mother: "MGM" }
  },
  {
    id: "mgm",
    pedigreeId: "MGM",
    title: "Maternal grandmother",
    lead: "Tell us a few details about your mother's mother.",
    sex: "Female",
    group: "Maternal side"
  },
  {
    id: "mgf",
    pedigreeId: "MGF",
    title: "Maternal grandfather",
    lead: "Tell us a few details about your mother's father.",
    sex: "Male",
    group: "Maternal side"
  },
  {
    id: "father",
    pedigreeId: "F",
    title: "Biological father",
    displayTitle: "Your father",
    lead: "Tell us a few details about your biological father.",
    sex: "Male",
    group: "Paternal side",
    parentIds: { father: "PGF", mother: "PGM" }
  },
  {
    id: "pgm",
    pedigreeId: "PGM",
    title: "Paternal grandmother",
    lead: "Tell us a few details about your father's mother.",
    sex: "Female",
    group: "Paternal side"
  },
  {
    id: "pgf",
    pedigreeId: "PGF",
    title: "Paternal grandfather",
    lead: "Tell us a few details about your father's father.",
    sex: "Male",
    group: "Paternal side"
  }
];

const groupDefs = {
  siblings: {
    title: "siblings",
    singular: "sibling",
    label: "Sibling",
    gateTitle: "Do you have siblings?",
    gateLead: "Brothers or sisters – anyone who shares your mother or father.",
    countTitle: "How many siblings do you have?",
    countLead: "Count your biological brothers and sisters. Include half-brothers and half-sisters – anyone who shares your mother or father.",
    formLead: "Tell us a few details about this sibling.",
    reviewTitle: "Review siblings",
    addLabel: "Add another sibling",
    next: "children",
    prefix: "S"
  },
  children: {
    title: "children",
    singular: "child",
    label: "Child",
    gateTitle: "Do you have biological children?",
    gateLead: "Include sons and daughters. Do not include stepchildren or adopted children here.",
    countTitle: "How many biological children do you have?",
    countLead: "Count your biological sons and daughters.",
    formLead: "Tell us a few details about this child.",
    reviewTitle: "Review children",
    addLabel: "Add another child",
    next: "maternalPiblings",
    prefix: "C"
  },
  maternalPiblings: {
    title: "maternal aunts and uncles",
    singular: "maternal aunt or uncle",
    label: "Maternal aunt/uncle",
    gateTitle: "Do you have any maternal aunts or uncles?",
    gateLead: "Your biological mother's sisters or brothers.",
    countTitle: "How many maternal aunts or uncles do you have?",
    countLead: "Count your biological mother's brothers and sisters.",
    formLead: "Tell us a few details about your mother's sister or brother.",
    reviewTitle: "Review maternal aunts and uncles",
    addLabel: "Add another maternal aunt or uncle",
    next: "paternalPiblings",
    prefix: "MP"
  },
  paternalPiblings: {
    title: "paternal aunts and uncles",
    singular: "paternal aunt or uncle",
    label: "Paternal aunt/uncle",
    gateTitle: "Do you have any paternal aunts or uncles?",
    gateLead: "Your biological father's sisters or brothers.",
    countTitle: "How many paternal aunts or uncles do you have?",
    countLead: "Count your biological father's brothers and sisters.",
    formLead: "Tell us a few details about your father's sister or brother.",
    reviewTitle: "Review paternal aunts and uncles",
    addLabel: "Add another paternal aunt or uncle",
    next: "otherGate",
    prefix: "PP"
  }
};

const otherTypeDefs = [
  {
    key: "grandchild",
    label: "Grandchild",
    plural: "grandchildren",
    hint: "Your children's child",
    lead: "Tell us a few details about this grandchild.",
    anchorQuestion: "Which of your children is their parent?",
    anchorPlaceholder: "Select a child",
    prefix: "GC",
    anchors: () => getGroupAnchors("children")
  },
  {
    key: "greatGrandchild",
    label: "Great-grandchild",
    plural: "great-grandchildren",
    hint: "Your grandchild's child",
    lead: "Tell us what you know about this great-grandchild.",
    anchorQuestion: "Which of your grandchildren is this person's parent?",
    anchorPlaceholder: "Select a grandchild",
    prefix: "GGC",
    anchors: () => state.other.items.filter(item => item.typeKey === "grandchild")
  },
  {
    key: "nieceNephew",
    label: "Niece or nephew",
    plural: "nieces and nephews",
    hint: "Your sibling's child",
    lead: "Tell us a few details about this niece or nephew.",
    anchorQuestion: "Which of your siblings is their parent?",
    anchorPlaceholder: "Select a sibling",
    prefix: "N",
    anchors: () => getGroupAnchors("siblings")
  },
  {
    key: "grandNieceNephew",
    label: "Great-niece or great-nephew",
    plural: "great-nieces and great-nephews",
    hint: "Your niece's/nephew's child",
    lead: "Tell us what you know about this great-niece or great-nephew.",
    anchorQuestion: "Which of your nieces or nephews is this person's parent?",
    anchorPlaceholder: "Select a niece or nephew",
    prefix: "GN",
    anchors: () => state.other.items.filter(item => item.typeKey === "nieceNephew")
  },
  {
    key: "firstCousin",
    label: "First cousin",
    plural: "first cousins",
    hint: "Your aunt's or uncle's child",
    lead: "This is your aunt's or uncle's child.",
    anchorQuestion: "Which of your relatives is this cousin's parent?",
    anchorPlaceholder: "Select an aunt or uncle",
    prefix: "FC",
    anchors: () => getGroupAnchors("maternalPiblings").concat(getGroupAnchors("paternalPiblings"))
  },
  {
    key: "grandAuntUncle",
    label: "Great-aunt or great-uncle",
    plural: "great-aunts and great-uncles",
    hint: "Your grandparent's sibling",
    lead: "This is your grandparent's sister or brother.",
    anchorQuestion: "Which of your grandparents is this relative's sibling?",
    anchorPlaceholder: "Select a grandparent",
    prefix: "GA",
    anchors: () => getGrandparentAnchors()
  },
  {
    key: "greatGrandparent",
    label: "Great-grandparent",
    plural: "great-grandparents",
    hint: "Your grandparent's parents",
    lead: "This is your grandparent's mother or father.",
    anchorQuestion: "Which of your grandparents is this person the parent of?",
    anchorPlaceholder: "Select a grandparent",
    prefix: "GGP",
    anchors: () => getGrandparentAnchors()
  }
];

let state = createInitialState();
let runtime = {
  fixedIndex: 0,
  editingFixedId: null,
  currentGroup: null,
  currentIndex: 0,
  editingIndex: null,
  returnToHub: false,
  editToHub: false,
  otherTypeKey: "",
  otherEditingIndex: null
};

const app = document.getElementById("app");

// init() is invoked at the very bottom of this file, after every const/function
// is declared, so the first render can safely reference late-defined values
// (e.g. ICON_TRASH used by the diagnosis editor).
function init() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("reset")) {
    localStorage.removeItem(STORAGE_KEY);
  }
  state = loadState() || createInitialState();
  renderQuickNav();
  renderProband();
}

function createInitialState() {
  const fixed = {};
  fixedDefs.forEach(def => {
    fixed[def.id] = blankPerson({
      recordId: def.id,
      pedigreeId: def.pedigreeId,
      relationship: def.title,
      sex: def.sex,
      parentIds: def.parentIds || {}
    });
  });
  return {
    proband: {
      // The proband's birth year comes from their medical record, so it isn't asked
      // in this flow — but it anchors the family's generations for age-conflict checks.
      birthYear: PROBAND_BIRTH_YEAR,
      cancer: "",
      diagnoses: [],
      treatedWhere: "",
      notes: ""
    },
    fixed,
    groups: {
      siblings: blankGroup(),
      children: blankGroup(),
      maternalPiblings: blankGroup(),
      paternalPiblings: blankGroup()
    },
    other: {
      has: "",
      items: []
    }
  };
}

function blankGroup() {
  return {
    has: "",
    selectedCount: "",
    count: 0,
    items: []
  };
}

function blankPerson(seed = {}) {
  return {
    recordId: seed.recordId || uniqueId("person"),
    pedigreeId: seed.pedigreeId || "",
    relationship: seed.relationship || "",
    sex: seed.sex || "",
    name: seed.name || "",
    birthYear: seed.birthYear || "",
    yearOfDeath: seed.yearOfDeath || "",
    living: seed.living || "",
    cancer: seed.cancer || "",
    diagnoses: seed.diagnoses || [],
    treatedWhere: seed.treatedWhere || "",
    notes: seed.notes || "",
    parentIds: seed.parentIds || {},
    anchorId: seed.anchorId || "",
    typeKey: seed.typeKey || ""
  };
}

function uniqueId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function setScreen(html, cardClass = "") {
  app.innerHTML = `<section class="card ${cardClass}">${html}</section>`;
  app.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}

function renderProband(fromHub = false) {
  runtime.returnToHub = fromHub;
  const p = state.proband;
  setScreen(`
    <h1>Have you ever been diagnosed with cancer?</h1>
    <fieldset>
      <legend class="sr-only">Cancer diagnosis</legend>
      ${errorSlot("probandCancerError")}
      ${radioRow("probandCancer", ["Yes", "No", "Not sure"], p.cancer, "toggleCancerPanel('probandCancerPanel', 'probandCancer')")}
    </fieldset>

    <div id="probandCancerPanel" class="cancer-panel ${p.cancer === "Yes" ? "is-open" : ""}">
      <p class="muted">We'll ask a few more questions about your cancer.</p>
      ${diagnosisEditor("proband", p.diagnoses)}
      <div class="field">
        <label for="probandTreatedWhere"><strong>Where you were treated</strong></label>
        <p class="hint">Add anything you remember — a hospital name, clinic, town, city, or county. Leave blank if you're not sure.</p>
        <textarea id="probandTreatedWhere">${escapeHtml(p.treatedWhere)}</textarea>
      </div>
      <div class="field">
        <label for="probandNotes" class="muted">Add anything else you know, such as treatment, stage, genetic testing, or other family history.</label>
        <textarea id="probandNotes">${escapeHtml(p.notes)}</textarea>
      </div>
    </div>

    ${buttonBar("Back", "saveProband()", "backFromProband()")}
  `);
}

function saveProband() {
  clearPersonErrors();
  const cancer = getRadio("probandCancer");
  const errors = [];
  if (!cancer) {
    errors.push(["probandCancerError", "Select whether you have had cancer."]);
  } else if (cancer === "Yes") {
    validateDiagnoses("proband").forEach(error => errors.push(error));
  }
  if (!applyErrors(errors)) return;
  state.proband.cancer = cancer;
  state.proband.diagnoses = readDiagnoses("proband");
  state.proband.treatedWhere = value("probandTreatedWhere");
  state.proband.notes = value("probandNotes");
  saveState();
  if (runtime.returnToHub) {
    runtime.returnToHub = false;
    renderFinalHub();
    return;
  }
  startFixedFlow();
}

function backFromProband() {
  if (runtime.returnToHub) {
    runtime.returnToHub = false;
    renderFinalHub();
    return;
  }
  alert("You're at the start of the assessment.");
}

function startFixedFlow() {
  runtime.fixedIndex = 0;
  runtime.editingFixedId = null;
  renderFixedForm(fixedDefs[0].id);
}

function renderFixedForm(id, fromReview = false, fromHub = false) {
  const def = fixedDefs.find(item => item.id === id);
  const person = state.fixed[id];
  runtime.editingFixedId = fromReview ? id : null;
  runtime.returnToHub = fromHub;

  setScreen(`
    <h1>${escapeHtml(def.title)}</h1>
    <p class="lead">${escapeHtml(def.lead)}</p>
    <p class="muted">Add what you know. Estimates are fine. You can skip optional questions if you're not sure.</p>
    ${personFields("fixed", person, { showSex: false, showSiblingShare: false })}
    ${buttonBar(fromReview ? "Back to review" : "Back", "saveFixedPerson()", "backFromFixed()", fromReview ? "Save changes" : "Continue")}
  `);
}

function saveFixedPerson() {
  if (!validatePersonForm("fixed", { showSex: false, showSiblingShare: false })) return;
  const id = runtime.editingFixedId || fixedDefs[runtime.fixedIndex].id;
  const def = fixedDefs.find(item => item.id === id);
  const existing = state.fixed[id];
  state.fixed[id] = {
    ...existing,
    ...readPersonFields("fixed"),
    sex: def.sex,
    relationship: def.title,
    pedigreeId: def.pedigreeId
  };
  saveState();
  if (runtime.editingFixedId) showToast("Changes saved");

  if (backToHubFromEdit()) return;
  if (runtime.editingFixedId) {
    renderParentsReview(runtime.returnToHub);
    return;
  }
  if (runtime.fixedIndex < fixedDefs.length - 1) {
    runtime.fixedIndex += 1;
    renderFixedForm(fixedDefs[runtime.fixedIndex].id);
    return;
  }
  renderParentsReview();
}

function backFromFixed() {
  if (backToHubFromEdit()) return;
  if (runtime.editingFixedId) {
    renderParentsReview(runtime.returnToHub);
    return;
  }
  if (runtime.fixedIndex > 0) {
    runtime.fixedIndex -= 1;
    renderFixedForm(fixedDefs[runtime.fixedIndex].id);
    return;
  }
  renderProband();
}

function renderParentsReview(fromHub = false) {
  runtime.returnToHub = fromHub;
  runtime.editToHub = false;
  const rows = fixedDefs.map(def => hubPersonRow(state.fixed[def.id], {
    role: def.displayTitle || def.title,
    edit: `renderFixedForm('${def.id}', true, ${fromHub})`
  })).join("");

  setScreen(`
    <h1>Review parents and grandparents</h1>
    <p class="lead">Check these details before you continue.</p>
    <div class="hub-people">${rows}</div>
    ${buttonBar("", "continueAfterParents()", "", "Continue")}
  `, "review-card");
}

function continueAfterParents() {
  if (runtime.returnToHub) {
    runtime.returnToHub = false;
    renderFinalHub();
    return;
  }
  renderGate("siblings");
}

function renderGate(groupKey, fromHub = false) {
  const def = groupDefs[groupKey];
  const group = state.groups[groupKey];
  runtime.currentGroup = groupKey;
  runtime.returnToHub = fromHub;

  setScreen(`
    <h1>${escapeHtml(def.gateTitle)}</h1>
    <p class="lead muted">${escapeHtml(def.gateLead)}</p>
    <fieldset>
      <legend class="sr-only">Choose one option</legend>
      ${radioRow(`${groupKey}Has`, ["Yes", "No"], group.has)}
      <div id="${groupKey}HasError" class="error">Select an answer to continue.</div>
    </fieldset>
    ${buttonBar("Back", `continueFromGate('${groupKey}')`, `backFromGate('${groupKey}')`)}
  `);
}

function continueFromGate(groupKey) {
  const group = state.groups[groupKey];
  const answer = getRadio(`${groupKey}Has`);
  if (!answer) {
    showError(`${groupKey}HasError`);
    return;
  }
  group.has = answer;
  if (answer === "No") {
    group.items = [];
    group.count = 0;
    group.selectedCount = "";
    saveState();
    continueAfterGroupNo(groupKey);
    return;
  }
  saveState();
  renderCount(groupKey);
}

function continueAfterGroupNo(groupKey) {
  if (runtime.returnToHub) {
    runtime.returnToHub = false;
    renderFinalHub();
    return;
  }
  const next = groupDefs[groupKey].next;
  if (next === "otherGate") renderOtherGate();
  else renderGate(next);
}

function backFromGate(groupKey) {
  const order = ["siblings", "children", "maternalPiblings", "paternalPiblings"];
  const index = order.indexOf(groupKey);
  if (runtime.returnToHub) {
    runtime.returnToHub = false;
    renderFinalHub();
    return;
  }
  if (index === 0) renderParentsReview();
  else renderRepeatReview(order[index - 1]);
}

function renderCount(groupKey) {
  const def = groupDefs[groupKey];
  const group = state.groups[groupKey];
  const selected = group.selectedCount;

  const moreMode = selected === "more";
  // "More" is just a switch to the numeric stepper; it carries no value floor of
  // its own. Start at the committed count if there is one, otherwise 6 (the first
  // number past the presets). The stepper can then go anywhere from 1 to 20.
  const moreValue = group.count || 6;

  const control = moreMode
    ? `
    <div class="stepper-row" role="group" aria-label="${escapeAttr(def.countTitle)}">
      <button type="button" class="stepper-button" onclick="stepCount('${groupKey}', -1)" aria-label="Fewer">&minus;</button>
      <label class="sr-only" for="${groupKey}MoreCount">How many</label>
      <input class="stepper-input" id="${groupKey}MoreCount" type="number" min="1" max="20" inputmode="numeric" value="${moreValue}">
      <button type="button" class="stepper-button" onclick="stepCount('${groupKey}', 1)" aria-label="More">+</button>
    </div>`
    : `
    <div class="count-row" role="group" aria-label="Choose how many">
      ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="count-button" data-count="${n}" aria-pressed="${String(selected) === String(n)}" onclick="selectCount('${groupKey}', '${n}')">${n}</button>`).join("")}
      <button type="button" class="count-button count-button--more" data-count="more" aria-pressed="false" onclick="selectCount('${groupKey}', 'more')">More</button>
    </div>`;

  setScreen(`
    <h1>${escapeHtml(def.countTitle)}</h1>
    <p class="lead muted">${escapeHtml(def.countLead)}</p>
    ${control}
    <div id="${groupKey}CountError" class="error">Choose how many to add.</div>
    ${buttonBar("Back", `startRepeatGroup('${groupKey}')`, `renderGate('${groupKey}')`)}
  `);
}

function selectCount(groupKey, count) {
  state.groups[groupKey].selectedCount = count;
  saveState();
  renderCount(groupKey);
}

function stepCount(groupKey, delta) {
  const input = document.getElementById(`${groupKey}MoreCount`);
  input.value = String(Math.max(1, Math.min(20, Number(input.value || 6) + delta)));
}

function startRepeatGroup(groupKey) {
  const group = state.groups[groupKey];
  if (!group.selectedCount) {
    showError(`${groupKey}CountError`);
    return;
  }
  const desired = group.selectedCount === "more"
    ? Number(document.getElementById(`${groupKey}MoreCount`).value || 6)
    : Number(group.selectedCount);
  group.count = desired;
  group.items = Array.from({ length: desired }, (_, index) => {
    return group.items[index] || createGroupPerson(groupKey, index);
  });
  saveState();
  renderRepeatForm(groupKey, 0);
}

function createGroupPerson(groupKey, index) {
  const def = groupDefs[groupKey];
  return blankPerson({
    recordId: `${groupKey}-${index + 1}`,
    pedigreeId: `${def.prefix}${index + 1}`,
    relationship: def.label
  });
}

function renderRepeatForm(groupKey, index, editing = false, fromHub = false, adding = false) {
  const def = groupDefs[groupKey];
  const group = state.groups[groupKey];
  const person = group.items[index] || createGroupPerson(groupKey, index);
  runtime.currentGroup = groupKey;
  runtime.currentIndex = index;
  runtime.editingIndex = editing ? index : null;
  runtime.returnToHub = fromHub;
  runtime.formMode = adding ? "add" : editing ? "edit" : "linear";

  const title = adding
    ? `Add another ${escapeHtml(def.singular)}`
    : editing
      ? `Change ${escapeHtml(def.singular)} details`
      : `${escapeHtml(def.label)} #${index + 1}`;
  const continueText = adding ? "Add and continue" : editing ? "Save changes" : "Continue";
  const backText = editing || adding ? "Back to review" : "Back";

  setScreen(`
    <h1>${title}</h1>
    <p class="lead">${escapeHtml(def.formLead)}</p>
    <p class="muted">Add what you know. Estimates are fine. You can skip optional questions if you're not sure.</p>
    ${personFields("repeat", person, { showSex: true, showSiblingShare: groupKey === "siblings" })}
    ${buttonBar(backText, "saveRepeatPerson()", "backFromRepeat()", continueText)}
  `);
}

function saveRepeatPerson() {
  const groupKey = runtime.currentGroup;
  if (!validatePersonForm("repeat", { showSex: true, showSiblingShare: groupKey === "siblings" })) return;
  const group = state.groups[groupKey];
  const index = runtime.currentIndex;
  const existing = group.items[index] || createGroupPerson(groupKey, index);
  const fields = readPersonFields("repeat");
  group.items[index] = {
    ...existing,
    ...fields,
    relationship: groupKey === "siblings" ? getRadio("repeatShareParents") : groupDefs[groupKey].label
  };
  // Adding commits the new slot here (it was not pushed up front), so bring the
  // group's bookkeeping in line with what's now in items.
  if (runtime.formMode === "add") {
    group.has = "Yes";
    group.count = group.items.length;
  }
  assignGroupPedigree(groupKey);
  saveState();
  if (runtime.formMode === "add") showToast(`${fields.name || groupDefs[groupKey].singular} added`);
  else if (runtime.formMode === "edit") showToast("Changes saved");

  if (backToHubFromEdit()) return;
  if (runtime.editingIndex !== null) {
    renderRepeatReview(groupKey, runtime.returnToHub);
    return;
  }
  if (index < group.items.length - 1) {
    renderRepeatForm(groupKey, index + 1);
    return;
  }
  renderRepeatReview(groupKey);
}

function assignGroupPedigree(groupKey) {
  const group = state.groups[groupKey];
  group.items.forEach((person, index) => {
    if (groupKey === "maternalPiblings") {
      person.pedigreeId = person.sex === "Female" ? `MA${index + 1}` : person.sex === "Male" ? `MU${index + 1}` : `MP${index + 1}`;
      person.parentIds = { father: "MGF", mother: "MGM" };
    } else if (groupKey === "paternalPiblings") {
      person.pedigreeId = person.sex === "Female" ? `PA${index + 1}` : person.sex === "Male" ? `PU${index + 1}` : `PP${index + 1}`;
      person.parentIds = { father: "PGF", mother: "PGM" };
    } else if (groupKey === "siblings") {
      person.pedigreeId = `S${index + 1}`;
      const share = person.relationship;
      person.parentIds = share === "Half-sibling, same mother"
        ? { father: `USF${index + 1}`, mother: "M" }
        : share === "Half-sibling, same father"
          ? { father: "F", mother: `USM${index + 1}` }
          : { father: "F", mother: "M" };
    } else if (groupKey === "children") {
      person.pedigreeId = `C${index + 1}`;
      person.parentIds = { parent: "P", otherParent: "UP1" };
    }
  });
}

function backFromRepeat() {
  const groupKey = runtime.currentGroup;
  // Adding: nothing has been committed yet (see addRepeatPerson). Confirm before
  // dropping a partly-filled form, then return to the review with no record left
  // behind — an untouched form discards silently.
  if (runtime.formMode === "add") {
    if (!confirmDiscardIfDirty("repeat", groupDefs[groupKey].singular)) return;
    if (backToHubFromEdit()) return;
    renderRepeatReview(groupKey, runtime.returnToHub);
    return;
  }
  if (backToHubFromEdit()) return;
  if (runtime.editingIndex !== null) {
    renderRepeatReview(groupKey, runtime.returnToHub);
    return;
  }
  if (runtime.currentIndex === 0) {
    renderCount(groupKey);
    return;
  }
  renderRepeatForm(groupKey, runtime.currentIndex - 1);
}

function renderRepeatReview(groupKey, fromHub = false) {
  runtime.currentGroup = groupKey;
  runtime.returnToHub = fromHub;
  runtime.editToHub = false;
  const def = groupDefs[groupKey];
  const group = state.groups[groupKey];
  const rows = group.items.length
    ? `<div class="hub-people">${group.items.map((person, index) => hubPersonRow(person, {
      groupKey,
      edit: `renderRepeatForm('${groupKey}', ${index}, true, ${fromHub})`,
      remove: `removeRepeatPerson('${groupKey}', ${index})`
    })).join("")}</div>`
    : `<div class="empty-state">You said you do not have any ${escapeHtml(def.title)}.</div>`;

  setScreen(`
    <h1>${escapeHtml(def.reviewTitle)}</h1>
    <p class="lead">${group.items.length ? `You added ${group.items.length} ${group.items.length === 1 ? def.singular : def.title}. Check these details before you continue.` : `You said you do not have any ${def.title}.`}</p>
    ${rows}
    ${hubAddLink(`addRepeatPerson('${groupKey}')`, def.addLabel)}
    ${buttonBar("", `continueAfterRepeatReview('${groupKey}')`, "", "Continue")}
  `, "review-card");
}

// Open a blank add form for the next slot WITHOUT committing it. The person is
// only pushed into the group once saveRepeatPerson validates the form (see the
// "add" branch there), so backing out of an untouched form no longer leaves an
// empty relative in the review. renderRepeatForm tolerates a not-yet-existing
// index by rendering a transient blank person for the fields.
function addRepeatPerson(groupKey) {
  const group = state.groups[groupKey];
  renderRepeatForm(groupKey, group.items.length, false, false, true);
}

function removeRepeatPerson(groupKey, index) {
  const group = state.groups[groupKey];
  const person = group.items[index];
  if (!confirm(`Remove ${person.name || groupDefs[groupKey].singular}? This will remove the details you added.`)) {
    runtime.editToHub = false;
    return;
  }
  group.items.splice(index, 1);
  group.count = group.items.length;
  assignGroupPedigree(groupKey);
  saveState();
  showToast(`${person.name || groupDefs[groupKey].singular} removed`);
  if (backToHubFromEdit()) return;
  renderRepeatReview(groupKey);
}

function continueAfterRepeatReview(groupKey) {
  if (runtime.returnToHub) {
    runtime.returnToHub = false;
    renderFinalHub();
    return;
  }
  const next = groupDefs[groupKey].next;
  if (next === "otherGate") renderOtherGate();
  else renderGate(next);
}

function renderOtherGate(fromHub = false) {
  runtime.returnToHub = fromHub;
  setScreen(`
    <h1>Do you know of any other blood relatives who have had cancer?</h1>
    <div class="lead muted">
      <p>Add more distant relatives who have had cancer, such as:</p>
      <ul>
        <li>grandchildren or great-grandchildren</li>
        <li>first cousins</li>
        <li>great-aunts or great-uncles</li>
        <li>nieces or nephews</li>
        <li>great-nieces or great-nephews</li>
        <li>great-grandparents</li>
      </ul>
      <p>Sometimes you'll add a healthy relative too, to link someone with cancer to the rest of your family. We'll guide you through it.</p>
    </div>
    <fieldset>
      <legend class="sr-only">Choose one option</legend>
      ${radioRow("otherHas", ["Yes", "No"], state.other.has)}
      <div id="otherHasError" class="error">Select an answer to continue.</div>
    </fieldset>
    ${buttonBar("Back", "continueFromOtherGate()", "renderRepeatReview('paternalPiblings')")}
  `);
}

function continueFromOtherGate() {
  const answer = getRadio("otherHas");
  if (!answer) {
    showError("otherHasError");
    return;
  }
  state.other.has = answer;
  if (answer === "No") {
    state.other.items = [];
    saveState();
    renderFinalHub();
    return;
  }
  saveState();
  // Straight into picking the first relative rather than an empty review. The
  // review is only shown once there is something to review (after the first save,
  // and as the hub for adding more).
  renderOtherTypeSelect();
}

function renderOtherReview(fromHub = false) {
  runtime.returnToHub = fromHub;
  runtime.editToHub = false;
  const rows = state.other.items.length
    ? `<div class="hub-people">${state.other.items.map((person, index) => hubPersonRow(person, {
      edit: `editOtherPerson(${index}, ${fromHub})`,
      remove: `removeOtherPerson(${index})`
    })).join("")}</div>`
    : `<div class="empty-state">No relatives added yet.</div>`;

  setScreen(`
    <h1>Other blood relatives</h1>
    <p class="lead">Add more distant relatives who have had cancer, plus any healthy relatives that link them to your family. Add one at a time.</p>
    ${rows}
    ${hubAddLink("renderOtherTypeSelect()", "Add a relative")}
    ${buttonBar("", "continueAfterOtherReview()", "", "Continue")}
  `, "review-card");
}

function renderOtherTypeSelect() {
  const available = availableOtherTypes();
  setScreen(`
    <h1>Which relative would you like to add?</h1>
    <p class="lead muted">Add relatives who have had cancer. You can also add a healthy relative to link someone with cancer to your family.</p>
    <p class="muted">Add the oldest relatives first, so each new person can be linked to someone already in your list. For example, add a parent before their child. Add one at a time.</p>
    <fieldset>
      <legend class="sr-only">Relationship type</legend>
      <div class="radio-stack">
        ${available.map(type => `
          <label class="radio-option">
            <input type="radio" name="otherType" value="${type.key}">
            <span>${escapeHtml(type.label)}<span class="subtext">${escapeHtml(type.hint)}</span></span>
          </label>
        `).join("")}
      </div>
      <div id="otherTypeError" class="error">Choose a relationship type.</div>
    </fieldset>
    ${buttonBar(state.other.items.length ? "Back to review" : "Back", "continueFromOtherType()", "backFromOtherType()")}
  `);
}

// Back from the relationship-type picker. The hub path takes precedence: an add
// launched from the final hub returns there, never into the section review
// (which is unreachable from the hub). Otherwise fall back to the linear
// destination — the review if relatives exist, else the section gate.
function backFromOtherType() {
  if (backToHubFromEdit()) return;
  if (state.other.items.length) renderOtherReview();
  else renderOtherGate();
}

// Every relationship type is always offered. Linking to a parent is now optional
// (see saveOtherPerson), so a relative can be added before the connecting relative
// exists — e.g. a great-grandchild before their grandchild. The hub flags any
// still-unlinked relative for recovery (see orphanRelatives).
function availableOtherTypes() {
  return otherTypeDefs;
}

function continueFromOtherType() {
  const key = getRadio("otherType");
  if (!key) {
    showError("otherTypeError");
    return;
  }
  runtime.otherTypeKey = key;
  runtime.otherEditingIndex = null;
  renderOtherForm(blankOtherPerson(key));
}

function blankOtherPerson(typeKey) {
  const type = otherTypeDefs.find(item => item.key === typeKey);
  const count = state.other.items.filter(item => item.typeKey === typeKey).length + 1;
  return blankPerson({
    recordId: `${typeKey}-${count}`,
    pedigreeId: `${type.prefix}${count}`,
    relationship: type.label,
    typeKey
  });
}

function renderOtherForm(person) {
  const type = otherTypeDefs.find(item => item.key === person.typeKey);
  const anchors = type.anchors();
  runtime.otherTypeKey = person.typeKey;
  const editing = runtime.otherEditingIndex !== null;
  const label = type.label.toLowerCase();
  const seq = sequenceForOther(person);
  const title = editing
    ? `Change ${escapeHtml(label)} details`
    : seq > 1
      ? `Add another ${escapeHtml(label)}`
      : `Add a ${escapeHtml(label)}`;
  setScreen(`
    <h1>${title}</h1>
    <p class="lead">${escapeHtml(type.lead)}</p>
    <p class="muted">Add what you know. Estimates are fine. You can skip optional questions if you're not sure.</p>
    <div class="field">
      <label for="otherName">Name</label>
      <input id="otherName" type="text" value="${escapeAttr(person.name)}" autocomplete="off">
    </div>
    <div class="field">
      <label for="otherAnchor">${escapeHtml(type.anchorQuestion)}</label>
      <p class="hint">Not added the connecting relative yet? Leave this blank — we'll remind you to link them before you finish.</p>
      ${errorSlot("otherAnchorError")}
      <select id="otherAnchor" onfocus="expandAnchorLabels(this)" onmousedown="expandAnchorLabels(this)" onchange="collapseAnchorLabel(this)" onblur="collapseAnchorLabel(this)">
        <option value="" ${person.anchorId ? "" : "selected"}>${escapeHtml(type.anchorPlaceholder || "Select a person")}</option>
        ${anchors.map(anchor => {
          const selected = person.anchorId === anchor.recordId;
          const text = selected ? anchorLabelShort(anchor) : anchorLabelFull(anchor);
          return `<option value="${escapeAttr(anchor.recordId)}" data-full="${escapeAttr(anchorLabelFull(anchor))}" data-short="${escapeAttr(anchorLabelShort(anchor))}" ${selected ? "selected" : ""}>${escapeHtml(text)}</option>`;
        }).join("")}
      </select>
    </div>
    ${sexField("other", person.sex)}
    ${yearField("otherBirthYear", person.birthYear)}
    ${livingField("other", person.living, person.yearOfDeath)}
    <fieldset>
      <legend><strong>Has this person ever been diagnosed with cancer?</strong></legend>
      ${errorSlot("otherCancerError")}
      ${radioRow("otherCancer", ["Yes", "No", "Not sure"], person.cancer, "toggleCancerPanel('otherCancerPanel', 'otherCancer')")}
    </fieldset>
    <div id="otherCancerPanel" class="cancer-panel ${person.cancer === "Yes" ? "is-open" : ""}">
      <hr class="divider">
      <p class="muted">We'll ask a few more questions about their cancer.</p>
      ${diagnosisEditor("other", person.diagnoses)}
      <div class="field">
        <label for="otherTreatedWhere"><strong>Where they were treated</strong></label>
        <p class="hint">Add anything you remember — a hospital name, clinic, town, city, or county. Leave blank if you're not sure.</p>
        <textarea id="otherTreatedWhere">${escapeHtml(person.treatedWhere)}</textarea>
      </div>
      <div class="field">
        <label for="otherNotes" class="muted">Add anything else you know, such as treatment, stage, genetic testing, or other family history.</label>
        <textarea id="otherNotes">${escapeHtml(person.notes)}</textarea>
      </div>
    </div>
    ${buttonBar(editing || runtime.editToHub ? "Back to review" : "Back", "saveOtherPerson()", "backFromOtherForm()", editing ? "Save changes" : "Add and continue")}
  `);
}

function saveOtherPerson() {
  if (!validatePersonForm("other", { showSex: true, showSiblingShare: false, hasCancerRadio: true, requireAnchor: false })) return;
  const type = otherTypeDefs.find(item => item.key === runtime.otherTypeKey);
  const isAdding = runtime.otherEditingIndex === null;
  const existing = isAdding
    ? blankOtherPerson(runtime.otherTypeKey)
    : state.other.items[runtime.otherEditingIndex];
  const cancer = getRadio("otherCancer");
  const person = {
    ...existing,
    relationship: type.label,
    name: value("otherName"),
    anchorId: value("otherAnchor"),
    sex: getRadio("otherSex"),
    birthYear: value("otherBirthYear"),
    living: getRadio("otherLiving"),
    yearOfDeath: getRadio("otherLiving") === "Died" ? value("otherDeathYear") : "",
    cancer,
    diagnoses: cancer === "Yes" ? readDiagnoses("other") : [],
    treatedWhere: value("otherTreatedWhere"),
    notes: value("otherNotes")
  };
  assignOtherParentLinks(person);
  if (isAdding) {
    state.other.items.push(person);
  } else {
    state.other.items[runtime.otherEditingIndex] = person;
  }
  state.other.has = "Yes";
  saveState();
  showToast(isAdding ? `${person.name || person.relationship} added` : "Changes saved");
  if (backToHubFromEdit()) return;
  renderOtherReview(runtime.returnToHub);
}

// Back from the other-relative form. Adding a new relative discards an
// uncommitted form (with a confirm if it's been touched); editing returns to the
// review with the saved record untouched. The hub path takes precedence so an
// edit/add launched from the final hub returns there.
function backFromOtherForm() {
  const editing = runtime.otherEditingIndex !== null;
  if (!editing && !confirmDiscardIfDirty("other", "relative")) return;
  if (backToHubFromEdit()) return;
  if (editing) {
    renderOtherReview(runtime.returnToHub);
    return;
  }
  renderOtherTypeSelect();
}

function editOtherPerson(index, fromHub = false) {
  runtime.otherEditingIndex = index;
  runtime.returnToHub = fromHub;
  renderOtherForm(state.other.items[index]);
}

function removeOtherPerson(index) {
  const person = state.other.items[index];
  if (!confirm(`Remove ${person.name || person.relationship}? This will remove the details you added.`)) {
    runtime.editToHub = false;
    return;
  }
  state.other.items.splice(index, 1);
  saveState();
  showToast(`${person.name || person.relationship} removed`);
  if (backToHubFromEdit()) return;
  renderOtherReview();
}

function continueAfterOtherReview() {
  if (runtime.returnToHub) {
    runtime.returnToHub = false;
    renderFinalHub();
    return;
  }
  renderFinalHub();
}

function assignOtherParentLinks(person) {
  const anchor = findPersonByRecordId(person.anchorId);
  // Reset first so clearing the anchor on an edit drops the old link and leaves
  // the relative unlinked (an orphan the hub will flag), rather than keeping a
  // stale parentIds carried over by the spread in saveOtherPerson.
  person.parentIds = {};
  if (!anchor) return;
  if (person.typeKey === "grandchild" || person.typeKey === "greatGrandchild" || person.typeKey === "nieceNephew" || person.typeKey === "grandNieceNephew" || person.typeKey === "firstCousin") {
    person.parentIds = { knownParent: anchor.pedigreeId, otherParent: `U-${person.pedigreeId}` };
  }
  if (person.typeKey === "grandAuntUncle") {
    person.parentIds = { sharesParentsWith: anchor.pedigreeId };
  }
  if (person.typeKey === "greatGrandparent") {
    person.parentIds = { parentOf: anchor.pedigreeId };
  }
}

const ICON_EDIT = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-9.96a1 1 0 0 0 0-1.41l-2.59-2.59a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
const ICON_KEBAB = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>`;
const ICON_WARNING = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"/></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z"/></svg>`;

// Close any open row menu when the user clicks away from it.
document.addEventListener("click", (event) => {
  if (!event.target.closest(".row-menu")) closeRowMenus();
});

/*
  The hub is the whole review. Every section is expanded and every relative is
  listed, so a problem (an age conflict, a missing answer) is visible without
  opening anything. Editing a relative here returns straight back to the hub
  (see runtime.editToHub), never via a section review.
*/
function renderFinalHub() {
  runtime.editToHub = false;
  closeRowMenus();

  // The proband ("You") is intentionally left off the hub. They give detailed
  // information about themselves before the family history begins; surfacing only
  // their cancer answer here reads as a thin, confusing section. The proband
  // screen remains reachable as the flow's entry point (see renderProband).
  const sections = [
    hubFixedSection(),
    hubGroupSection("siblings", "Siblings"),
    hubGroupSection("children", "Children"),
    hubGroupSection("maternalPiblings", "Maternal aunts and uncles"),
    hubGroupSection("paternalPiblings", "Paternal aunts and uncles"),
    hubOtherSection()
  ].join("");

  // Each flagged relative carries an inline warning on its own row (see
  // hubPersonRow): an age conflict, or a relative not yet linked to the family.
  // On confirm, submitFinalHub() fills and reveals this single global error
  // (hidden until then), which points back to the highlighted rows without naming
  // anyone — a calm prompt to review rather than a heavier per-relative banner.
  setScreen(`
    <h1>Review your family history</h1>
    <p class="lead muted">Check everyone's details below. You can change or remove any relative.</p>
    <div class="hub-error" id="hub-error" role="alert" tabindex="-1" hidden></div>
    <div class="hub-review">${sections}</div>
    <div class="button-bar single-action">
      <button class="button" onclick="submitFinalHub()">Confirm and continue</button>
    </div>
  `, "hub-card");
}

/*
  Confirm gate. If any relative still has a problem — a birth-year conflict, or a
  relative not yet linked to the family — fill and reveal the global error and
  move focus to it (role="alert" also announces it) instead of submitting. The
  user fixes the highlighted rows and confirms again. With nothing left to fix,
  the flow proceeds (here, the prototype's end-of-flow alert).
*/
function submitFinalHub() {
  const conflicts = ageConflictEdges().length > 0;
  const orphans = orphanRelatives().length;
  const error = document.getElementById("hub-error");
  if (conflicts || orphans) {
    if (error) {
      error.innerHTML = hubErrorBody(orphans, conflicts);
      error.hidden = false;
      error.focus();
    }
    return;
  }
  if (error) error.hidden = true;
  alert("That is the end of the prototype. In the real service, this would submit your answers.");
}

/*
  Body for the global hub error, built from whatever is currently wrong. Unlinked
  relatives lead (they block a valid pedigree outright); a birth-year conflict is
  the softer "please double-check". The recovery route is spelt out: add the
  connecting relative, then edit the highlighted one to link it.
*/
function hubErrorBody(orphanCount, hasConflicts) {
  const messages = [];
  if (orphanCount) {
    messages.push(orphanCount === 1
      ? "One relative isn't linked to your family yet. Add the connecting relative, then edit the highlighted one to link it."
      : `${orphanCount} relatives aren't linked to your family yet. Add the connecting relatives, then edit the highlighted ones to link them.`);
  }
  if (hasConflicts) {
    messages.push("Some birth years need another look. Please check the highlighted relatives.");
  }
  return `${ICON_WARNING}<div><strong>Some details need another look</strong>${messages.map(text => `<p>${escapeHtml(text)}</p>`).join("")}</div>`;
}

// A relative added without a usable link to the rest of the family: no anchor
// chosen, or an anchor that no longer resolves (e.g. the connecting relative was
// later removed). These can't be placed on the pedigree, so the hub flags them
// for recovery. Only "other blood relatives" can be orphaned — they're the only
// records with an optional anchor (typeKey is set on them alone).
function isOrphanRelative(person) {
  return Boolean(person.typeKey) && !findPersonByRecordId(person.anchorId);
}

function orphanRelatives() {
  return state.other.items.filter(isOrphanRelative);
}

// Brief success confirmation, lives on <body> so it survives the #app re-render
// that follows a save. Announced politely for screen readers.
function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  // Restart the enter animation even on rapid successive saves.
  toast.classList.remove("is-visible");
  void toast.offsetWidth;
  toast.classList.add("is-visible");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function hubSection(title, body) {
  return `
    <section class="hub-section">
      <h2 class="hub-section-title">${escapeHtml(title)}</h2>
      ${body}
    </section>
  `;
}

function hubFixedSection() {
  const rows = fixedDefs.map(def => hubPersonRow(state.fixed[def.id], {
    role: def.displayTitle || def.title,
    edit: `editFixedFromHub('${def.id}')`
  })).join("");
  return hubSection("Parents and grandparents", `<div class="hub-people">${rows}</div>`);
}

function hubGroupSection(groupKey, title) {
  const group = state.groups[groupKey];
  const def = groupDefs[groupKey];
  let body;
  if (!group.has) {
    body = hubEmptyBody("Not answered yet", `openGroupFromHub('${groupKey}')`, "Answer this section");
  } else if (group.has === "No" || !group.items.length) {
    body = hubEmptyBody(`None — you said you do not have any ${def.title}.`, `addGroupFromHub('${groupKey}')`, `Add a ${def.singular}`);
  } else {
    const rows = group.items.map((person, index) => hubPersonRow(person, {
      groupKey,
      edit: `editGroupFromHub('${groupKey}', ${index})`,
      remove: `removeGroupFromHub('${groupKey}', ${index})`
    })).join("");
    body = `<div class="hub-people">${rows}</div>${hubAddLink(`addGroupFromHub('${groupKey}')`, def.addLabel)}`;
  }
  return hubSection(title, body);
}

function hubOtherSection() {
  let body;
  if (!state.other.has) {
    body = hubEmptyBody("Not answered yet", "openOtherFromHub()", "Answer this section");
  } else if (state.other.has === "No" || !state.other.items.length) {
    body = hubEmptyBody("None added.", "addOtherFromHub()", "Add a relative");
  } else {
    const rows = state.other.items.map((person, index) => hubPersonRow(person, {
      edit: `editOtherFromHub(${index})`,
      remove: `removeOtherFromHub(${index})`
    })).join("");
    body = `<div class="hub-people">${rows}</div>${hubAddLink("addOtherFromHub()", "Add another relative")}`;
  }
  return hubSection("Other blood relatives", body);
}

function hubEmptyBody(text, action, actionLabel) {
  return `
    <div class="hub-people"><p class="hub-empty">${escapeHtml(text)}</p></div>
    ${hubAddLink(action, actionLabel)}
  `;
}

function hubAddLink(action, label) {
  return `<div class="hub-add"><button type="button" class="link-button primary-link hub-add-link" onclick="${action}">${escapeHtml(label)}</button></div>`;
}

/*
  One relative on the hub. Title leads with the name and the friendly role; the
  muted meta carries precise clinical detail (relationship, sex, lifespan); a
  cancer is pulled out into its own emphasised line so the eye finds it. An age
  conflict adds a red inline warning that names the broken rule, not the person.
  Pencil edits; the kebab (when removable) reveals Remove.
*/
function hubPersonRow(person, opts) {
  const role = opts.role || friendlyRelation(person, opts) || person.relationship || person.pedigreeId || "Relative";
  // The name leads in bold; the relationship is secondary (lighter weight and
  // colour). With no name, the role itself becomes the bold lead.
  const titleText = person.name ? `${person.name} — ${role}` : role;
  const titleHtml = person.name
    ? `<strong>${escapeHtml(person.name)}</strong><span class="row-role"> — ${escapeHtml(role)}</span>`
    : `<strong>${escapeHtml(role)}</strong>`;
  const metaBits = [];
  const half = halfSiblingMeta(person);
  if (half) metaBits.push(half);
  const span = lifespanText(person);
  if (span) metaBits.push(span);
  const meta = metaBits.join(" · ");
  const cancer = cancerBlockHtml(person);
  const warning = ageConflictRowMessage(person);
  const orphan = isOrphanRelative(person);
  const rowId = person.recordId ? ` id="row-${escapeAttr(person.recordId)}"` : "";
  return `
    <article class="person-row"${rowId}>
      <div class="person-main">
        <div class="row-title">${titleHtml}</div>
        ${meta ? `<div class="row-meta">${escapeHtml(meta)}</div>` : ""}
        ${cancer}
        ${orphan ? `<p class="row-warning">${ICON_WARNING}<span>Not linked to your family yet. Edit to link this relative.</span></p>` : ""}
        ${warning ? `<p class="row-warning">${ICON_WARNING}<span>${escapeHtml(warning)}</span></p>` : ""}
      </div>
      <div class="person-actions">
        <button type="button" class="icon-button edit" aria-label="Edit ${escapeAttr(titleText)}" onclick="${opts.edit}">${ICON_EDIT}</button>
        ${opts.remove ? rowMenu(opts.remove, titleText) : ""}
      </div>
    </article>
  `;
}

/*
  Cancer in three quiet tiers. A diagnosis is the loud one: an orange-bulleted
  list, one line per cancer. "Not sure" gets its own neutral grey line. "No"
  (and the answered-but-blank case) say nothing at all — a blank cancer area
  unambiguously means no cancer, because the question is always answered.
*/
function cancerBlockHtml(person) {
  if (person.cancer === "Yes" || person.diagnoses.length) {
    const units = person.diagnoses.length
      ? person.diagnoses.map(diagnosisLabelHtml)
      : ["Unknown cancer"];
    return `<ul class="row-cancer">${units.map(unit => `<li>${unit}</li>`).join("")}</ul>`;
  }
  if (person.cancer === "Not sure") {
    return `<div class="row-unsure">Not sure about cancer</div>`;
  }
  return "";
}

// One diagnosis as "Type (age)", with a muted "(?)" placeholder when the age
// was left out. A skipped type falls back to "Unknown cancer" (matching the
// clinician referral form) but stays in the loud diagnosis tier — it is still a
// confirmed cancer. Bilateral breast cancer is two separate primaries, so both
// ages are shown: "(45 and 52)". A triple-negative breast cancer adds a muted
// "· triple negative" note — only when answered "Yes", since it is the one
// triple-negative state that changes the risk calc and referral; "No"/"Not sure"
// stay silent to keep the summary scannable.
function diagnosisLabelHtml(item) {
  const type = escapeHtml(item.type || "Unknown cancer");
  const note = item.type === BREAST_CANCER && item.tripleNegative === "Yes"
    ? ` <span class="row-cancer-note">· triple negative</span>`
    : "";
  if (item.type === BREAST_CANCER && item.laterality === "Both breasts") {
    return `${type} (${ageOrPlaceholder(item.age)} and ${ageOrPlaceholder(item.age2)})${note}`;
  }
  return `${type} (${ageOrPlaceholder(item.age)})${note}`;
}

function ageOrPlaceholder(age) {
  return age
    ? escapeHtml(String(age))
    : `<span class="placeholder" aria-label="age at diagnosis not added">?</span>`;
}

// "Same mother" / "Same father" for a half-sibling; null otherwise. The fuller
// "Half-brother" / "Half-sister" wording is promoted into the row title.
function halfSiblingMeta(person) {
  if (person.relationship === "Half-sibling, same mother") return "Same mother";
  if (person.relationship === "Half-sibling, same father") return "Same father";
  return null;
}

function rowMenu(removeAction, title) {
  return `
    <div class="row-menu">
      <button type="button" class="icon-button menu-toggle" aria-haspopup="true" aria-expanded="false" aria-label="More options for ${escapeAttr(title)}" onclick="toggleRowMenu(this)">${ICON_KEBAB}</button>
      <div class="row-menu-popover">
        <button type="button" class="menu-item danger" onclick="${removeAction}">Remove</button>
      </div>
    </div>
  `;
}

function toggleRowMenu(btn) {
  const menu = btn.closest(".row-menu");
  if (!menu) return;
  const open = menu.classList.contains("is-open");
  closeRowMenus();
  if (!open) {
    menu.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
  }
}

function closeRowMenus() {
  document.querySelectorAll(".row-menu.is-open").forEach(menu => {
    menu.classList.remove("is-open");
    const toggle = menu.querySelector(".menu-toggle");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  });
}

// Send the user straight back to the hub after an edit launched from the hub.
function backToHubFromEdit() {
  if (!runtime.editToHub) return false;
  runtime.editToHub = false;
  runtime.returnToHub = false;
  renderFinalHub();
  return true;
}

// Guard for leaving an uncommitted "add" form. Returns true when it is safe to
// discard (the form is untouched, or the user confirmed) and false to stay put.
// Now that backing out of an add no longer leaves a saved record, this stops an
// accidental Back from quietly throwing away half-entered details.
function confirmDiscardIfDirty(prefix, noun = "relative") {
  if (!personFormDirty(prefix)) return true;
  return confirm(`Discard this ${noun}? The details you've added won't be saved.`);
}

// Has the user actually put anything into the form? Used only by the add flow,
// where every field starts empty. The cancer question is deliberately ignored:
// it defaults to "Yes" for other relatives, so it is not user-entered progress.
function personFormDirty(prefix) {
  if (value(`${prefix}Name`)) return true;
  if (getRadio(`${prefix}Sex`)) return true;
  if (value(`${prefix}BirthYear`)) return true;
  if (getRadio(`${prefix}Living`)) return true;
  if (value(`${prefix}DeathYear`)) return true;
  if (value(`${prefix}TreatedWhere`)) return true;
  if (value(`${prefix}Notes`)) return true;
  if (getRadio(`${prefix}ShareParents`)) return true; // siblings only
  if (prefix === "other" && value("otherAnchor")) return true;
  return readDiagnoses(prefix).length > 0;
}

function editFixedFromHub(id) {
  runtime.editToHub = true;
  renderFixedForm(id, true, true);
}

function editGroupFromHub(groupKey, index) {
  runtime.editToHub = true;
  renderRepeatForm(groupKey, index, true, true);
}

function addGroupFromHub(groupKey) {
  runtime.editToHub = true;
  addRepeatPerson(groupKey);
}

function removeGroupFromHub(groupKey, index) {
  runtime.editToHub = true;
  removeRepeatPerson(groupKey, index);
}

function editOtherFromHub(index) {
  runtime.editToHub = true;
  editOtherPerson(index, true);
}

function addOtherFromHub() {
  runtime.editToHub = true;
  renderOtherTypeSelect();
}

function removeOtherFromHub(index) {
  runtime.editToHub = true;
  removeOtherPerson(index);
}

// Only reachable for an unanswered section ("Answer this section" on the hub),
// so it always lands on the gate; answering it returns to the hub. There is no
// section-review screen reachable from the hub — edits happen in place per row.
function openGroupFromHub(groupKey) {
  renderGate(groupKey, true);
}

function openOtherFromHub() {
  renderOtherGate(true);
}

function personFields(prefix, person, opts) {
  return `
    <div class="field">
      <label for="${prefix}Name">Name</label>
      <input id="${prefix}Name" type="text" value="${escapeAttr(person.name)}" autocomplete="off">
    </div>
    ${opts.showSex ? sexField(prefix, person.sex) : ""}
    ${opts.showSiblingShare ? siblingShareField(prefix, person.relationship) : ""}
    ${yearField(`${prefix}BirthYear`, person.birthYear)}
    ${livingField(prefix, person.living, person.yearOfDeath)}
    <fieldset>
      <legend><strong>Has this person ever been diagnosed with cancer?</strong></legend>
      ${errorSlot(`${prefix}CancerError`)}
      ${radioRow(`${prefix}Cancer`, ["Yes", "No", "Not sure"], person.cancer, `toggleCancerPanel('${prefix}CancerPanel', '${prefix}Cancer')`)}
    </fieldset>
    <div id="${prefix}CancerPanel" class="cancer-panel ${person.cancer === "Yes" ? "is-open" : ""}">
      <hr class="divider">
      <p class="muted">We'll ask a few more questions about their cancer.</p>
      ${diagnosisEditor(prefix, person.diagnoses)}
      <div class="field">
        <label for="${prefix}TreatedWhere"><strong>Where they were treated</strong></label>
        <p class="hint">Add anything you remember — a hospital name, clinic, town, city, or county. Leave blank if you're not sure.</p>
        <textarea id="${prefix}TreatedWhere">${escapeHtml(person.treatedWhere)}</textarea>
      </div>
      <div class="field">
        <label for="${prefix}Notes" class="muted">Add anything else you know, such as treatment, stage, genetic testing, or other family history.</label>
        <textarea id="${prefix}Notes">${escapeHtml(person.notes)}</textarea>
      </div>
    </div>
  `;
}

function readPersonFields(prefix) {
  const cancer = getRadio(`${prefix}Cancer`);
  return {
    name: value(`${prefix}Name`),
    sex: getRadio(`${prefix}Sex`),
    birthYear: value(`${prefix}BirthYear`),
    living: getRadio(`${prefix}Living`),
    yearOfDeath: getRadio(`${prefix}Living`) === "Died" ? value(`${prefix}DeathYear`) : "",
    cancer,
    diagnoses: cancer === "Yes" ? readDiagnoses(prefix) : [],
    treatedWhere: value(`${prefix}TreatedWhere`),
    notes: value(`${prefix}Notes`)
  };
}

function sexField(prefix, current) {
  return `
    <fieldset>
      <legend>Sex listed at birth</legend>
      ${errorSlot(`${prefix}SexError`)}
      <div class="segmented">
        ${["Female", "Male"].map(label => `
          <label class="segment-option">
            <input type="radio" name="${prefix}Sex" value="${label}" ${current === label ? "checked" : ""}>
            <span aria-hidden="true">${label === "Female" ? "&#9792;" : "&#9794;"}</span>
            <span>${label}</span>
          </label>
        `).join("")}
      </div>
    </fieldset>
  `;
}

function siblingShareField(prefix, current) {
  return `
    <fieldset>
      <legend>Which biological parents do you share with this sibling?</legend>
      ${errorSlot(`${prefix}ShareParentsError`)}
      <div class="radio-stack">
        <label class="radio-option">
          <input type="radio" name="${prefix}ShareParents" value="Full sibling" ${current === "Full sibling" ? "checked" : ""}>
          <span>Full sibling<span class="subtext">Shares both biological parents</span></span>
        </label>
        <label class="radio-option"><input type="radio" name="${prefix}ShareParents" value="Half-sibling, same mother" ${current === "Half-sibling, same mother" ? "checked" : ""}> <span>Half-sibling, same mother</span></label>
        <label class="radio-option"><input type="radio" name="${prefix}ShareParents" value="Half-sibling, same father" ${current === "Half-sibling, same father" ? "checked" : ""}> <span>Half-sibling, same father</span></label>
      </div>
    </fieldset>
  `;
}

function yearField(id, current) {
  return `
    <div class="field">
      <label for="${id}">Year of birth</label>
      <p class="hint">Enter the year if you know it. If you're not sure, give an estimate; for example, 1890, 1980, or your best guess.</p>
      ${errorSlot(`${id}Error`)}
      <input class="short-input" id="${id}" type="number" inputmode="numeric" value="${escapeAttr(current)}">
    </div>
  `;
}

function livingField(prefix, current, deathYear) {
  const name = `${prefix}Living`;
  return `
    <fieldset>
      <legend>Living status</legend>
      ${errorSlot(`${prefix}LivingError`)}
      ${radioRow(name, ["Alive", "Died", "Not sure"], current, `toggleDeathYear('${prefix}')`)}
      <div id="${prefix}DeathYearPanel" class="reveal-panel ${current === "Died" ? "is-open" : ""}">
        <label for="${prefix}DeathYear">Year of death</label>
        <p class="hint">Enter the year if you know it. Leave blank if you're not sure.</p>
        ${errorSlot(`${prefix}DeathYearError`)}
        <input class="short-input" id="${prefix}DeathYear" type="number" inputmode="numeric" value="${escapeAttr(deathYear || "")}">
      </div>
    </fieldset>
  `;
}

function diagnosisEditor(prefix, diagnoses) {
  const rows = diagnoses && diagnoses.length ? diagnoses : [{}];
  const heading = prefix === "proband"
    ? "What type of cancer did you have, and how old were you when you were diagnosed?"
    : "What type of cancer did they have, and how old were they when they were diagnosed?";
  return `
    <div class="field">
      <label><strong>${heading}</strong></label>
      <div id="${prefix}DiagnosisRows">
        ${rows.map((diagnosis, index) => {
          // A cancer type can be chosen once per person, so hide the types
          // already picked in the other rows (the row keeps its own value).
          const taken = rows.filter((_, i) => i !== index).map(d => d.type).filter(Boolean);
          return diagnosisRow(prefix, diagnosis, index, taken);
        }).join("")}
      </div>
      <button class="link-button primary-link" onclick="addDiagnosisRow('${prefix}')">+ Add another cancer diagnosis</button>
    </div>
  `;
}

// A diagnosis row is a cancer-type selector with a trash control to its right
// (Design Sprint 2026 node 21582-270675), then a body below. Every cancer keeps
// the same removal placement; breast cancer alone grows a laterality question in
// its body. The body re-renders on type / laterality change so the right age
// field(s) appear without rebuilding the whole row.
// The cancer-type <option> set for one row. Types already chosen in other rows
// are dropped so each type can be picked once per person; the row's own current
// value is always kept so it still renders selected. The blank placeholder (a
// skipped type → "Unknown cancer") is always available and never deduped.
function diagnosisTypeOptions(selected, takenTypes = []) {
  const taken = new Set(takenTypes);
  return `
    <option value="">Select a cancer type</option>
    ${cancerTypes
      .filter(type => type === selected || !taken.has(type))
      .map(type => `<option value="${escapeAttr(type)}" ${selected === type ? "selected" : ""}>${escapeHtml(type)}</option>`)
      .join("")}
  `;
}

function diagnosisRow(prefix, diagnosis = {}, index = 0, takenTypes = []) {
  return `
    <div class="diagnosis-group" data-diagnosis-row data-prefix="${escapeAttr(prefix)}" data-index="${index}">
      <div class="diagnosis-type-row">
        <div class="diagnosis-field diagnosis-type-field">
          <label for="${prefix}CancerType${index}" class="label">Cancer type</label>
          ${errorSlot(`${prefix}CancerType${index}Error`)}
          <select id="${prefix}CancerType${index}" data-diagnosis-type onchange="onDiagnosisTypeChange(this)">
            ${diagnosisTypeOptions(diagnosis.type, takenTypes)}
          </select>
        </div>
        <button class="icon-button remove-diagnosis" type="button" aria-label="Remove this cancer" onclick="removeDiagnosisRow(this)">${ICON_TRASH}</button>
      </div>
      <div class="diagnosis-body" data-diagnosis-body>
        ${diagnosisBody(prefix, diagnosis, index)}
      </div>
    </div>
  `;
}

// Everything below the cancer-type selector. Breast cancer asks which breast(s)
// were affected: "Both breasts" means two separate primaries, each with its own
// age (BR1, BR2); anything else is a single age. Other cancers keep one age.
// Breast cancer also asks whether it was triple negative — this follows the
// age(s), once which-breast is answered, so the easy factual questions come
// first and the optional pathology question comes last.
function diagnosisBody(prefix, diagnosis = {}, index = 0) {
  if (diagnosis.type === BREAST_CANCER) {
    const laterality = diagnosis.laterality || "";
    let ages = "";
    if (laterality === "Both breasts") {
      ages = `
        ${ageField(prefix, index, diagnosis.age, "Age at first diagnosis")}
        ${ageField(prefix, index, diagnosis.age2, "Age at second diagnosis", {
          suffix: "2",
          attr: "data-diagnosis-age2",
          hint: "If both were found at the same time, enter the same age"
        })}
      `;
    } else if (laterality) {
      ages = ageField(prefix, index, diagnosis.age, "Age at diagnosis");
    }
    const tripleNegative = laterality ? tripleNegativeRow(prefix, index, diagnosis.tripleNegative) : "";
    return `${breastLateralityRow(prefix, index, laterality)}${ages}${tripleNegative}`;
  }
  return ageField(prefix, index, diagnosis.age, "Age at diagnosis");
}

// Triple negative is a tumour-pathology attribute of a breast cancer, not a
// separate cancer type — it maps to the single CanRisk ER column per relative
// (Yes -> ER=0, No -> ER=1, Not sure / unanswered -> ER=NA). One question per
// person is correct: the one-type-once rule means a person has at most one
// breast-cancer row, so this single flag covers a bilateral (BC1+BC2) case too.
// It is optional and left unselected by default: an unanswered question and an
// explicit "Not sure" both mean ER unknown downstream, so we never pre-tick an
// answer the patient did not give.
function tripleNegativeRow(prefix, index, current) {
  const name = `${prefix}TripleNegative${index}`;
  const options = ["Yes", "No", "Not sure"];
  return `
    <div class="diagnosis-field">
      <label class="label">Was the breast cancer triple negative (TNBC)?</label>
      <p class="hint">A type of breast cancer that doesn't respond to hormone treatments. Choose "Not sure" if you don't know.</p>
      <div class="radio-stack">
        ${options.map(option => `
          <label class="radio-option">
            <input type="radio" name="${name}" value="${escapeAttr(option)}" data-diagnosis-tnbc ${current === option ? "checked" : ""}>
            <span class="radio-option-text"><span>${escapeHtml(option)}</span></span>
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

function breastLateralityRow(prefix, index, current) {
  const name = `${prefix}Laterality${index}`;
  const options = [
    { value: "One breast" },
    { value: "Both breasts", subtext: "Two separate cancers, one in each breast — not one that spread." },
    { value: "Not sure" }
  ];
  return `
    <div class="diagnosis-field">
      <label class="label">Was the cancer in one breast or both?</label>
      <div class="radio-stack">
        ${options.map(option => `
          <label class="radio-option${option.subtext ? " has-subtext" : ""}">
            <input type="radio" name="${name}" value="${escapeAttr(option.value)}" data-diagnosis-laterality ${current === option.value ? "checked" : ""} onchange="onLateralityChange(this)">
            <span class="radio-option-text">
              <span>${escapeHtml(option.value)}</span>
              ${option.subtext ? `<span class="subtext">${escapeHtml(option.subtext)}</span>` : ""}
            </span>
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

// One age input. The default reads back via [data-diagnosis-age]; the bilateral
// breast "second diagnosis" passes attr=data-diagnosis-age2 + suffix="2" so the
// two ages stay separable in both the DOM lookup and their element ids.
function ageField(prefix, index, value, label, opts = {}) {
  const attr = opts.attr || "data-diagnosis-age";
  const id = `${prefix}CancerAge${opts.suffix || ""}${index}`;
  return `
    <div class="diagnosis-field">
      <label for="${id}" class="label">${escapeHtml(label)}</label>
      ${opts.hint ? `<p class="hint">${escapeHtml(opts.hint)}</p>` : ""}
      ${errorSlot(`${id}Error`)}
      <input class="short-input" id="${id}" ${attr} type="number" inputmode="numeric" min="0" max="125" value="${escapeAttr(value || "")}">
    </div>
  `;
}

function addDiagnosisRow(prefix) {
  const root = document.getElementById(`${prefix}DiagnosisRows`);
  // The index becomes part of every field id in the row, so it must stay unique
  // for the life of the screen. Use max(existing index) + 1 rather than the row
  // count: removing a middle row leaves a gap, and a count-based index would
  // reuse a number still in play and collide ids (e.g. two "probandCancerType2").
  const rows = Array.from(root.querySelectorAll("[data-diagnosis-row]"));
  const indices = rows.map(row => Number(row.dataset.index) || 0);
  const index = indices.length ? Math.max(...indices) + 1 : 0;
  // The new (empty) row can't offer types already chosen in the existing rows.
  const taken = rows.map(row => row.querySelector("[data-diagnosis-type]").value).filter(Boolean);
  root.insertAdjacentHTML("beforeend", diagnosisRow(prefix, {}, index, taken));
}

// Rebuild every row's type dropdown so each picked type is hidden from the other
// rows. Called after any change that frees up or claims a type (pick, add,
// remove). Each select keeps its own value selected.
function refreshDiagnosisTypeOptions(root) {
  if (!root) return;
  const selects = Array.from(root.querySelectorAll("[data-diagnosis-type]"));
  selects.forEach(select => {
    const taken = selects.filter(other => other !== select).map(other => other.value).filter(Boolean);
    select.innerHTML = diagnosisTypeOptions(select.value, taken);
  });
}

// The trash control removes its row, except when it is the only diagnosis left —
// then it clears the row back to empty so there is always one row to fill.
function removeDiagnosisRow(button) {
  const root = button.closest("[id$='DiagnosisRows']");
  const row = button.closest("[data-diagnosis-row]");
  if (root.querySelectorAll("[data-diagnosis-row]").length === 1) {
    const select = row.querySelector("[data-diagnosis-type]");
    if (select) select.value = "";
    rerenderDiagnosisBody(row, {});
    refreshDiagnosisTypeOptions(root);
    return;
  }
  row.remove();
  refreshDiagnosisTypeOptions(root);
}

// Re-render just the body of a row (laterality + age fields) for a diagnosis.
function rerenderDiagnosisBody(row, diagnosis) {
  const body = row.querySelector("[data-diagnosis-body]");
  if (body) body.innerHTML = diagnosisBody(row.dataset.prefix, diagnosis, Number(row.dataset.index) || 0);
}

function onDiagnosisTypeChange(select) {
  const row = select.closest("[data-diagnosis-row]");
  if (!row) return;
  const current = readDiagnosisRowValues(row);
  rerenderDiagnosisBody(row, {
    type: select.value,
    laterality: select.value === BREAST_CANCER ? current.laterality : "",
    age: current.age,
    age2: current.age2,
    tripleNegative: select.value === BREAST_CANCER ? current.tripleNegative : ""
  });
  // This row's pick changes what the other rows may offer.
  refreshDiagnosisTypeOptions(row.closest("[id$='DiagnosisRows']"));
}

function onLateralityChange(input) {
  const row = input.closest("[data-diagnosis-row]");
  if (!row) return;
  const current = readDiagnosisRowValues(row);
  current.laterality = input.value;
  rerenderDiagnosisBody(row, current);
}

function readDiagnosisRowValues(row) {
  const typeEl = row.querySelector("[data-diagnosis-type]");
  const latEl = row.querySelector("[data-diagnosis-laterality]:checked");
  const ageEl = row.querySelector("[data-diagnosis-age]");
  const age2El = row.querySelector("[data-diagnosis-age2]");
  const tnbcEl = row.querySelector("[data-diagnosis-tnbc]:checked");
  return {
    type: typeEl ? typeEl.value : "",
    laterality: latEl ? latEl.value : "",
    age: ageEl ? ageEl.value.trim() : "",
    age2: age2El ? age2El.value.trim() : "",
    tripleNegative: tnbcEl ? tnbcEl.value : ""
  };
}

// Read every diagnosis row into the stored shape. laterality/age2 are kept only
// for breast cancer (and age2 only for the bilateral case), so a person who
// switched away from breast doesn't carry stale fields. Fully empty rows are
// dropped, so an untouched "Add another" row never persists as a blank entry.
function readDiagnoses(prefix) {
  const root = document.getElementById(`${prefix}DiagnosisRows`);
  if (!root) return [];
  return Array.from(root.querySelectorAll("[data-diagnosis-row]")).map(row => {
    const values = readDiagnosisRowValues(row);
    const diagnosis = { type: values.type, age: values.age };
    if (values.type === BREAST_CANCER) {
      diagnosis.laterality = values.laterality;
      if (values.laterality === "Both breasts") diagnosis.age2 = values.age2;
      if (values.tripleNegative) diagnosis.tripleNegative = values.tripleNegative;
    }
    return diagnosis;
  }).filter(item => item.type || item.age || item.age2);
}

function radioRow(name, options, current, onchange = "") {
  return `<div class="radio-row">${options.map(option => `
    <label class="radio-option">
      <input type="radio" name="${name}" value="${escapeAttr(option)}" ${current === option ? "checked" : ""} ${onchange ? `onchange="${onchange}"` : ""}>
      <span>${escapeHtml(option)}</span>
    </label>
  `).join("")}</div>`;
}

function buttonBar(backText, continueAction, backAction, continueText = "Continue") {
  const singleAction = !backText;
  return `
    <div class="button-bar${singleAction ? " single-action" : ""}">
      ${backText ? `<button class="link-button" onclick="${backAction}">${escapeHtml(backText)}</button>` : ""}
      <button class="button" onclick="${continueAction}">${escapeHtml(continueText)}</button>
    </div>
  `;
}

// Friendly, human relationship word for a person, or null when no mapping fits
// (caller then falls back to the stored relationship/label). Close kinds get a
// familiar word (Brother, Daughter, Aunt…); distant kinds keep their formal term
// (First cousin, Great-niece…). Keyed off a stable category — never off
// `person.relationship`, which for siblings holds "Full sibling"/"Half-sibling…".
const FRIENDLY_GROUP = {
  siblings: { Male: "Brother", Female: "Sister" },
  children: { Male: "Son", Female: "Daughter" },
  maternalPiblings: { Male: "Uncle", Female: "Aunt" },
  paternalPiblings: { Male: "Uncle", Female: "Aunt" }
};
const FRIENDLY_OTHER = {
  grandchild: { Male: "Grandson", Female: "Granddaughter" },
  greatGrandchild: { Male: "Great-grandson", Female: "Great-granddaughter" },
  nieceNephew: { Male: "Nephew", Female: "Niece" },
  grandNieceNephew: { Male: "Great-nephew", Female: "Great-niece" },
  firstCousin: { Male: "First cousin", Female: "First cousin", "": "First cousin" },
  grandAuntUncle: { Male: "Great-uncle", Female: "Great-aunt" },
  greatGrandparent: { Male: "Great-grandfather", Female: "Great-grandmother" }
};

function friendlyRelation(person, opts = {}) {
  if (!person) return null;
  if (person.typeKey && FRIENDLY_OTHER[person.typeKey]) {
    return FRIENDLY_OTHER[person.typeKey][person.sex] || null;
  }
  let groupKey = opts.groupKey;
  if (!groupKey && person.recordId) {
    const candidate = String(person.recordId).split("-")[0];
    if (groupDefs[candidate]) groupKey = candidate;
  }
  if (groupKey && FRIENDLY_GROUP[groupKey]) {
    if (groupKey === "siblings" && person.relationship && person.relationship.startsWith("Half-sibling")) {
      return person.sex === "Male" ? "Half-brother" : person.sex === "Female" ? "Half-sister" : null;
    }
    return FRIENDLY_GROUP[groupKey][person.sex] || null;
  }
  return null;
}

// Lifespan for the review rows: "Alive · Born 1958" while living, "Died ·
// 1934–2002" when deceased (en dash range). Year of death is optional, so a
// missing one shows a "?" placeholder ("Died · 1982–?"); "Died" alone guards
// against a bare "?–?" if the birth year is somehow absent too.
function lifespanText(person) {
  const born = person.birthYear;
  const yod = person.yearOfDeath;
  if (person.living === "Died") {
    return born ? `Died · ${born}–${yod || "?"}` : "Died";
  }
  if (person.living === "Alive") {
    return born ? `Alive · Born ${born}` : "Alive";
  }
  return born ? `Born ${born}` : "";
}

/*
  The only row flag left is the age conflict. Missing-data chips were removed:
  hard-gated fields can't be blank, and optional gaps already show a quiet "(?)"
  placeholder, so a chip would just be noise. An age conflict is different — it
  can corrupt the pedigree fed to CanRisk — so each affected row carries an
  inline red warning (see hubPersonRow). The message states the rule that's been
  broken rather than naming anyone, so it reads the same wherever it appears and
  never singles a relative out.

  Parent/child links whose birth years can't be true: a child born fewer than
  MIN_PARENT_AGE years after their parent. Checked across every link, not just
  the proband's, so an uncle/cousin mismatch is caught too.
*/
function ageConflictEdges() {
  return parentChildEdges().filter(({ parent, child }) => {
    const parentYob = toYear(parent.birthYear);
    const childYob = toYear(child.birthYear);
    return parentYob && childYob && childYob - parentYob < MIN_PARENT_AGE;
  });
}

/*
  The inline warning for a conflicted row. Returns null when the person is clear.
  The wording is dynamic (it adapts to the relationship in play) but deliberately
  name-free — it states the rule, framed from the proband's point of view ("you")
  when the proband is one end of the link. Both rows of a conflict show the same
  rule, so it reads as a reminder, not an accusation.
*/
function ageConflictRowMessage(person) {
  const edges = ageConflictEdges().filter(({ parent, child }) =>
    person.recordId === parent.recordId || person.recordId === child.recordId);
  if (!edges.length) return null;
  // A relative can break several links at once (e.g. a parent younger than both
  // you and your siblings). Prefer the edge that involves you, so the clearer
  // first-person wording wins over the generic rule.
  const edge = edges.find(e => e.parent.recordId === "proband" || e.child.recordId === "proband") || edges[0];
  if (edge.child.recordId === "proband") return "Check the birth years — a parent should be much older than you.";
  if (edge.parent.recordId === "proband") return "Check the birth years — a child should be much younger than you.";
  return "Check the birth years — a parent should be much older than their child.";
}

/*
  Real parent -> child links derived from each person's parentIds. Synthetic
  placeholders (unknown spouses "USF#"/"USM#"/"UP1", "other" partners "U-…")
  resolve to nobody and are skipped. greatGrandparent stores the grandparent it
  is the parent of, so that edge is added in the parent->child direction.

  The proband is included explicitly: they are not part of allPeople() (they are
  never shown on the hub), but their own mother/father links must be walked so a
  parent entered as younger than the proband is caught ("A parent should be older
  than you"). The proband also appears as a *parent* via their children's "P"
  link, so the children edges still resolve through findPersonByPedigreeId("P").
*/
function parentChildEdges() {
  const edges = [];
  const add = (parent, child) => {
    if (parent && child && parent.recordId !== child.recordId) edges.push({ parent, child });
  };
  [...allPeople(), probandAsPerson()].forEach(person => {
    const ids = person.parentIds || {};
    ["father", "mother", "parent", "knownParent"].forEach(key => {
      if (ids[key]) add(findPersonByPedigreeId(ids[key]), person);
    });
    if (ids.parentOf) add(person, findPersonByPedigreeId(ids.parentOf));
  });
  return edges;
}

function probandAsPerson() {
  // The mother/father links let the age check catch a parent entered as younger
  // than the proband ("a parent can't be younger than you"). The proband's own
  // birth year is fixed (from their record), so any such conflict is fixed on
  // the parent's row, never the proband's.
  return { ...state.proband, recordId: "proband", pedigreeId: "P", relationship: "You", parentIds: { mother: "M", father: "F" } };
}

function getGroupAnchors(groupKey) {
  return state.groups[groupKey].items || [];
}

function getGrandparentAnchors() {
  return ["mgm", "mgf", "pgm", "pgf"].map(id => state.fixed[id]);
}

function findPersonByRecordId(recordId) {
  return allPeople().find(person => person.recordId === recordId);
}

function findPersonByPedigreeId(pedigreeId) {
  if (pedigreeId === "P") return probandAsPerson();
  return allPeople().find(person => person.pedigreeId === pedigreeId);
}

function allPeople() {
  return [
    ...Object.values(state.fixed),
    ...Object.values(state.groups).flatMap(group => group.items),
    ...state.other.items
  ];
}

// Labels for one candidate parent/anchor in the "other relatives" dropdown. The
// name leads when it exists ("Patricia — aunt, mother's side"); when it was
// skipped the role plus family side stands in for it.
//
// Two forms, because a native <select> only ever shows the *selected* option's
// own text when collapsed. The open list always carries the year so look-alikes
// stay apart ("Patricia — aunt, mother's side · born 1960"); the collapsed field
// drops it for named people (the name is identity enough) but keeps it for
// nameless ones (the year is all they have). A focus/blur swap (see
// expandAnchorLabels / collapseAnchorLabel) flips each option between the two.
function anchorLabelFull(person) {
  const role = anchorRole(person);
  const base = person.name ? `${person.name} — ${lowerFirst(role)}` : role;
  const year = anchorYear(person);
  return year ? `${base} · ${year}` : base;
}

function anchorLabelShort(person) {
  const role = anchorRole(person);
  if (person.name) return `${person.name} — ${lowerFirst(role)}`;
  const year = anchorYear(person);
  return year ? `${role} · ${year}` : role;
}

// Year that pins a person down: birth year if known, otherwise year of death.
function anchorYear(person) {
  if (person.birthYear) return `born ${person.birthYear}`;
  if (person.yearOfDeath) return `died ${person.yearOfDeath}`;
  return "";
}

// Role with family side where the side isn't already implied. Aunts/uncles can be
// on either side, so we add it; grandparents already carry it in their
// relationship ("Maternal grandmother"), and siblings/children/descendants sit on
// a single, unambiguous branch.
function anchorRole(person) {
  const base = friendlyRelation(person) || person.relationship || person.pedigreeId;
  return `${base}${anchorSide(person)}`;
}

function anchorSide(person) {
  const group = String(person.recordId || "").split("-")[0];
  if (group === "maternalPiblings") return ", mother's side";
  if (group === "paternalPiblings") return ", father's side";
  return "";
}

function lowerFirst(text) {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

// Open the anchor list: show every option's full label (with year) so
// look-alikes are distinguishable while choosing.
function expandAnchorLabels(select) {
  for (const option of select.options) {
    if (option.dataset.full) option.textContent = option.dataset.full;
  }
}

// Close the anchor list: drop back to the short label so the collapsed field
// stays uncluttered (named people lose the year; nameless keep it as identity).
function collapseAnchorLabel(select) {
  for (const option of select.options) {
    if (option.dataset.short) option.textContent = option.dataset.short;
  }
}

function sequenceForOther(person) {
  const existing = state.other.items.filter(item => item.typeKey === person.typeKey);
  if (runtime.otherEditingIndex !== null) return existing.findIndex(item => item.recordId === person.recordId) + 1;
  return existing.length + 1;
}

function toggleCancerPanel(panelId, radioName) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  panel.classList.toggle("is-open", getRadio(radioName) === "Yes");
}

function getRadio(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : "";
}

function value(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function showError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("is-open");
}

/*
  Inline validation for the person forms (proband, parents/grandparents, repeatable
  groups, other blood relatives). Rules follow the validation spec table in
  Design Sprint 2026 (node 21868:223079). Errors render between a field's label/hint
  and its control; there is no top-of-page error summary in this flow.

  Error/control wiring uses an id convention: an error slot's id is the control id
  plus "Error" (e.g. "repeatBirthYear" -> "repeatBirthYearError"). For text/number
  inputs the control gets a red border; for radio groups (no single control id) the
  enclosing fieldset gets a red left accent instead.
*/
function errorSlot(id) {
  return `<p class="field-error" id="${id}" role="alert" hidden><span class="field-error__text"></span></p>`;
}

function setFieldError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.querySelector(".field-error__text").textContent = message;
  el.hidden = false;
  const control = document.getElementById(id.replace(/Error$/, ""));
  if (control) {
    control.classList.add("input-error");
    control.setAttribute("aria-invalid", "true");
  }
}

function clearPersonErrors() {
  if (!app) return;
  app.querySelectorAll(".field-error:not([hidden])").forEach(el => {
    el.hidden = true;
    const text = el.querySelector(".field-error__text");
    if (text) text.textContent = "";
  });
  app.querySelectorAll(".input-error").forEach(el => {
    el.classList.remove("input-error");
    el.removeAttribute("aria-invalid");
  });
}

function focusFirstError() {
  const firstError = app && app.querySelector(".field-error:not([hidden])");
  if (!firstError) return;
  const control = document.getElementById(firstError.id.replace(/Error$/, ""));
  if (control) {
    control.focus();
    return;
  }
  const radio = firstError.closest("fieldset") && firstError.closest("fieldset").querySelector("input");
  if (radio) radio.focus();
  else firstError.scrollIntoView({ block: "center" });
}

function toggleDeathYear(prefix) {
  const panel = document.getElementById(`${prefix}DeathYearPanel`);
  if (panel) panel.classList.toggle("is-open", getRadio(`${prefix}Living`) === "Died");
}

function validateYear(raw, { kind, required, birthYear } = {}) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) {
    if (required && kind === "birth") return "Add a year of birth. An estimate is fine.";
    return null;
  }
  if (!/^\d{4}$/.test(trimmed)) return "Use 4 digits for the year.";
  const year = Number(trimmed);
  const currentYear = new Date().getFullYear();
  if (kind === "birth") {
    if (year < 1800) return "Use a year from 1800 onwards.";
    if (year > currentYear) return "Year of birth needs to be in the past.";
  } else {
    if (birthYear && year < birthYear) return "Year of death needs to be after year of birth.";
    if (year > currentYear) return "Year of death needs to be in the past.";
  }
  return null;
}

function validatePersonForm(prefix, opts = {}) {
  const { showSex = false, showSiblingShare = false, hasCancerRadio = true, requireAnchor = false } = opts;
  clearPersonErrors();
  const errors = [];

  if (requireAnchor && !value(`${prefix}Anchor`)) {
    errors.push([`${prefix}AnchorError`, "Select who this relative is linked to."]);
  }
  if (showSiblingShare && !getRadio(`${prefix}ShareParents`)) {
    errors.push([`${prefix}ShareParentsError`, "Select how this person is biologically related."]);
  }
  if (showSex && !getRadio(`${prefix}Sex`)) {
    errors.push([`${prefix}SexError`, "Select the sex listed at birth."]);
  }

  const birthYearError = validateYear(value(`${prefix}BirthYear`), { kind: "birth", required: true });
  if (birthYearError) errors.push([`${prefix}BirthYearError`, birthYearError]);

  const living = getRadio(`${prefix}Living`);
  if (!living) {
    errors.push([`${prefix}LivingError`, "Select whether this person is living or has died."]);
  } else if (living === "Died") {
    const deathYearError = validateYear(value(`${prefix}DeathYear`), { kind: "death", birthYear: toYear(value(`${prefix}BirthYear`)) });
    if (deathYearError) errors.push([`${prefix}DeathYearError`, deathYearError]);
  }

  const cancer = hasCancerRadio ? getRadio(`${prefix}Cancer`) : "Yes";
  if (hasCancerRadio && !cancer) {
    errors.push([`${prefix}CancerError`, "Select whether this person has had cancer."]);
  } else if (cancer === "Yes") {
    validateDiagnoses(prefix).forEach(error => errors.push(error));
  }

  return applyErrors(errors);
}

// Diagnoses are collected, not gated: a skipped cancer type is allowed (it maps
// to "Unknown cancer" downstream) and a person with cancer can proceed with no
// details at all. So this only flags genuinely invalid data — an out-of-range
// age, or a bilateral breast pair where the second diagnosis predates the first.
function validateDiagnoses(prefix) {
  const errors = [];
  const root = document.getElementById(`${prefix}DiagnosisRows`);
  if (!root) return errors;
  const rows = Array.from(root.querySelectorAll("[data-diagnosis-row]"));
  rows.forEach(row => {
    const ageEl = row.querySelector("[data-diagnosis-age]");
    const age2El = row.querySelector("[data-diagnosis-age2]");
    const age = ageEl ? ageEl.value.trim() : "";
    const age2 = age2El ? age2El.value.trim() : "";
    if (ageEl && age && !validDiagnosisAge(age)) {
      errors.push([`${ageEl.id}Error`, "Enter an age from 0 to 125."]);
    }
    if (age2El && age2 && !validDiagnosisAge(age2)) {
      errors.push([`${age2El.id}Error`, "Enter an age from 0 to 125."]);
    }
    // Bilateral breast: the second diagnosis can't predate the first (equal is
    // fine — both found at once). A blank second age is allowed; only check when
    // both are present and valid, so this never collides with the range error.
    if (age2El && validDiagnosisAge(age) && validDiagnosisAge(age2) && Number(age) > Number(age2)) {
      errors.push([`${age2El.id}Error`, "Age at second diagnosis can't be younger than the first."]);
    }
  });
  return errors;
}

function validDiagnosisAge(age) {
  return /^\d+$/.test(age) && Number(age) >= 0 && Number(age) <= 125;
}

function applyErrors(errors) {
  errors.forEach(([id, message]) => setFieldError(id, message));
  if (errors.length) {
    focusFirstError();
    return false;
  }
  return true;
}

function toYear(value) {
  const year = Number(value);
  return Number.isFinite(year) && year > 0 ? year : null;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

/*
  Prototype-only seed data used by jump-to, which fills the sections before the
  target so you land on coherent context. Builds a believable sample family that
  exercises every screen and branch, including older affected relatives (maternal
  breast/ovarian + paternal bowel). Strip with renderQuickNav.
*/
const fixedSeeds = {
  mother: { name: "Susan", birthYear: "1958", living: "Alive", cancer: "Yes", diagnoses: [{ type: "Breast cancer", laterality: "Both breasts", age: "49", age2: "54" }], treatedWhere: "Poole Hospital" },
  mgm: { name: "Margaret", birthYear: "1934", living: "Died", yearOfDeath: "2002", cancer: "Yes", diagnoses: [{ type: "Breast cancer", laterality: "One breast", age: "61" }, { type: "Ovarian cancer", age: "66" }] },
  mgf: { name: "George", birthYear: "1931", living: "Died", yearOfDeath: "1998", cancer: "No" },
  father: { name: "David", birthYear: "1956", living: "Alive", cancer: "No" },
  pgm: { name: "Joan", birthYear: "1936", living: "Died", yearOfDeath: "2010", cancer: "No" },
  pgf: { name: "Brian", birthYear: "1933", living: "Died", yearOfDeath: "2005", cancer: "Yes", diagnoses: [{ type: "Bowel cancer", age: "72" }] }
};

const groupSeeds = {
  siblings: [
    { name: "Claire", sex: "Female", birthYear: "1985", living: "Alive", cancer: "No", relationship: "Full sibling" },
    { name: "Mark", sex: "Male", birthYear: "1982", living: "Alive", cancer: "No", relationship: "Full sibling" }
  ],
  children: [
    { name: "Emma", sex: "Female", birthYear: "2012", living: "Alive", cancer: "No" },
    { name: "Tom", sex: "Male", birthYear: "2014", living: "Alive", cancer: "No" }
  ],
  maternalPiblings: [
    { name: "Patricia", sex: "Female", birthYear: "1960", living: "Alive", cancer: "Yes", diagnoses: [{ type: "Ovarian cancer", age: "55" }] },
    { name: "Robert", sex: "Male", birthYear: "1962", living: "Alive", cancer: "No" }
  ],
  paternalPiblings: [
    { name: "Linda", sex: "Female", birthYear: "1959", living: "Alive", cancer: "No" },
    { name: "Paul", sex: "Male", birthYear: "1961", living: "Alive", cancer: "No" }
  ]
};

const otherSeeds = [
  { typeKey: "firstCousin", name: "James", sex: "Male", birthYear: "1983", living: "Alive", diagnoses: [{ type: "Bowel cancer", age: "38" }], anchorRecordId: "maternalPiblings-1" },
  { typeKey: "grandAuntUncle", name: "Edith", sex: "Female", birthYear: "1930", living: "Died", yearOfDeath: "2001", diagnoses: [{ type: "Breast cancer", laterality: "One breast", age: "67" }], anchorRecordId: "mgm" }
];

function seedProband() {
  state.proband = { birthYear: PROBAND_BIRTH_YEAR, cancer: "No", diagnoses: [], treatedWhere: "", notes: "" };
}

function seedFixed() {
  fixedDefs.forEach(def => {
    state.fixed[def.id] = blankPerson({
      recordId: def.id,
      pedigreeId: def.pedigreeId,
      relationship: def.title,
      sex: def.sex,
      parentIds: def.parentIds || {},
      ...(fixedSeeds[def.id] || {})
    });
  });
}

function seedGroup(groupKey) {
  const seeds = groupSeeds[groupKey];
  const group = state.groups[groupKey];
  group.has = "Yes";
  group.selectedCount = String(seeds.length);
  group.count = seeds.length;
  group.items = seeds.map((seed, index) => ({ ...createGroupPerson(groupKey, index), ...seed }));
  assignGroupPedigree(groupKey);
}

function seedOther() {
  state.other.has = "Yes";
  state.other.items = [];
  otherSeeds.forEach(seed => {
    const type = otherTypeDefs.find(item => item.key === seed.typeKey);
    const count = state.other.items.filter(item => item.typeKey === seed.typeKey).length + 1;
    const person = blankPerson({
      recordId: `${seed.typeKey}-${count}`,
      pedigreeId: `${type.prefix}${count}`,
      relationship: type.label,
      typeKey: seed.typeKey,
      name: seed.name,
      sex: seed.sex,
      birthYear: seed.birthYear,
      living: seed.living,
      yearOfDeath: seed.yearOfDeath || "",
      cancer: "Yes",
      diagnoses: seed.diagnoses,
      anchorId: seed.anchorRecordId
    });
    assignOtherParentLinks(person);
    state.other.items.push(person);
  });
}

/*
  Per-page auto-fill for the quick-nav "Fill" action. Populates only the screen
  the user is currently on, leaving them there to review or keep editing. Fills
  empty controls only, so anything answered by hand is respected and re-clicking
  is harmless. Saving happens normally when the user presses Continue.
*/
const sampleFemaleNames = ["Sarah", "Helen", "Karen", "Jane", "Ruth", "Alison", "Diane", "Carol"];
const sampleMaleNames = ["Peter", "Andrew", "Stephen", "Colin", "Gary", "Neil", "Keith", "Ian"];
const sampleNeutralNames = ["Alex", "Sam", "Jordan", "Charlie"];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function sampleName(sex) {
  if (sex === "Female") return pick(sampleFemaleNames);
  if (sex === "Male") return pick(sampleMaleNames);
  return pick(sampleNeutralNames);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el && !el.value.trim()) el.value = val;
}

function checkRadioIfNone(name, val) {
  if (getRadio(name)) return false;
  const el = document.querySelector(`input[name="${name}"][value="${val}"]`);
  if (!el) return false;
  el.checked = true;
  return true;
}

function currentFixedSex() {
  const id = runtime.editingFixedId || fixedDefs[runtime.fixedIndex].id;
  const def = fixedDefs.find(item => item.id === id);
  return def ? def.sex : "";
}

/*
  Generation-appropriate birth years so Fill never invents a parent/child age
  conflict (the validation flags a gap under MIN_PARENT_AGE). Bands are anchored
  to the proband generation (~1983) and keep at least ~14 years between tiers.
*/
const birthYearBands = {
  grandparent: [1922, 1936],
  parent: [1950, 1965],
  pibling: [1950, 1968],
  sibling: [1982, 1996],
  child: [2008, 2016]
};

function randomYearIn([min, max]) {
  return String(min + Math.floor(Math.random() * (max - min + 1)));
}

function currentFixedBirthYear() {
  const id = runtime.editingFixedId || fixedDefs[runtime.fixedIndex].id;
  return randomYearIn(id === "mother" || id === "father" ? birthYearBands.parent : birthYearBands.grandparent);
}

function currentRepeatBirthYear() {
  const tier = { siblings: "sibling", children: "child", maternalPiblings: "pibling", paternalPiblings: "pibling" };
  return randomYearIn(birthYearBands[tier[runtime.currentGroup] || "sibling"]);
}

// "Other" relatives derive from the selected anchor so they sit a generation away from it.
const otherYearOffset = {
  grandchild: 25, greatGrandchild: 25, nieceNephew: 25, grandNieceNephew: 25, firstCousin: 25,
  grandAuntUncle: -3, greatGrandparent: -28
};

function currentOtherBirthYear() {
  const anchor = findPersonByRecordId(value("otherAnchor"));
  const base = anchor ? toYear(anchor.birthYear) : null;
  if (!base) return randomYearIn([1955, 1980]);
  const offset = otherYearOffset[runtime.otherTypeKey] ?? 25;
  return String(Math.min(new Date().getFullYear(), base + offset));
}

function fillDiagnosisRows(prefix) {
  const root = document.getElementById(`${prefix}DiagnosisRows`);
  if (!root) return;
  const randomAge = () => String(45 + Math.floor(Math.random() * 30));
  root.querySelectorAll("[data-diagnosis-row]").forEach(row => {
    const type = row.querySelector("[data-diagnosis-type]");
    if (type && !type.value) {
      type.value = pick(["Breast cancer", "Bowel cancer", "Ovarian cancer", "Prostate cancer"]);
      onDiagnosisTypeChange(type);
    }
    // Breast cancer only shows an age field once a laterality is chosen.
    const laterality = row.querySelectorAll("[data-diagnosis-laterality]");
    if (laterality.length && !row.querySelector("[data-diagnosis-laterality]:checked")) {
      const choice = pick(Array.from(laterality));
      choice.checked = true;
      onLateralityChange(choice);
    }
    const age = row.querySelector("[data-diagnosis-age]");
    if (age && !age.value.trim()) age.value = randomAge();
    const age2 = row.querySelector("[data-diagnosis-age2]");
    if (age2 && !age2.value.trim()) age2.value = randomAge();
  });
}

function fillPersonScreen(prefix, opts) {
  let sex = getRadio(`${prefix}Sex`);
  if (opts.showSex && !sex) {
    sex = pick(["Female", "Male"]);
    checkRadioIfNone(`${prefix}Sex`, sex);
  }
  const nameSex = opts.showSex ? sex : (opts.sexForName || "");
  setText(`${prefix}Name`, sampleName(nameSex));

  if (opts.showSiblingShare) checkRadioIfNone(`${prefix}ShareParents`, "Full sibling");

  if (opts.birthYear) setText(`${prefix}BirthYear`, opts.birthYear);

  checkRadioIfNone(`${prefix}Living`, "Alive");
  toggleDeathYear(prefix);
  if (getRadio(`${prefix}Living`) === "Died") {
    const born = Number(value(`${prefix}BirthYear`)) || 1950;
    const death = Math.min(new Date().getFullYear(), born + 60 + Math.floor(Math.random() * 20));
    setText(`${prefix}DeathYear`, String(death));
  }

  if (opts.hasCancerRadio) {
    checkRadioIfNone(`${prefix}Cancer`, "No");
    toggleCancerPanel(`${prefix}CancerPanel`, `${prefix}Cancer`);
    if (getRadio(`${prefix}Cancer`) === "Yes") fillDiagnosisRows(prefix);
  }
}

function fillCurrentScreen() {
  if (document.querySelector('input[name="probandCancer"]')) {
    fillPersonScreen("proband", { showSex: false, hasCancerRadio: true, sexForName: "" });
  } else if (document.getElementById("otherName")) {
    fillPersonScreen("other", { showSex: true, hasCancerRadio: true, birthYear: currentOtherBirthYear() });
  } else if (document.getElementById("repeatName")) {
    fillPersonScreen("repeat", {
      showSex: true,
      hasCancerRadio: true,
      showSiblingShare: Boolean(document.querySelector('input[name="repeatShareParents"]')),
      birthYear: currentRepeatBirthYear()
    });
  } else if (document.getElementById("fixedName")) {
    fillPersonScreen("fixed", { showSex: false, hasCancerRadio: true, sexForName: currentFixedSex(), birthYear: currentFixedBirthYear() });
  } else if (document.querySelector('input[name$="Has"]')) {
    checkRadioIfNone(document.querySelector('input[name$="Has"]').name, "Yes");
  } else if (document.querySelector('.count-button[data-count="2"]')) {
    if (!document.querySelector('.count-button[aria-pressed="true"]')) {
      document.querySelector('.count-button[data-count="2"]').click();
    }
  } else if (document.querySelector('input[name="otherType"]')) {
    if (!getRadio("otherType")) document.querySelector('input[name="otherType"]').checked = true;
  }
}

function isFixedSeeded() {
  const mother = state.fixed.mother;
  return Boolean(mother && (mother.living || mother.birthYear || mother.name));
}

/*
  Seed only the sections before a jump target, leaving already-answered sections
  (and the target itself) untouched, so a jump always lands on coherent context.
*/
function seedSectionsBefore(targetIndex) {
  const steps = [
    () => { if (!state.proband.cancer) seedProband(); },
    () => { if (!isFixedSeeded()) seedFixed(); },
    () => { if (!state.groups.siblings.has) seedGroup("siblings"); },
    () => { if (!state.groups.children.has) seedGroup("children"); },
    () => { if (!state.groups.maternalPiblings.has) seedGroup("maternalPiblings"); },
    () => { if (!state.groups.paternalPiblings.has) seedGroup("paternalPiblings"); },
    () => { if (!state.other.has) seedOther(); }
  ];
  for (let i = 0; i < targetIndex && i < steps.length; i++) steps[i]();
  saveState();
}

/*
  Prototype-only quick nav (see styles.css). Two always-visible actions: "Fill"
  populates only the current screen so you can move through fast or still edit by
  hand; "Jump to..." opens a panel of milestone shortcuts, and jumping also seeds
  any earlier sections so you land on coherent context. Targets #quick-nav,
  outside #app so setScreen() never clears it. Strip this from the real product.
*/
function renderQuickNav() {
  const container = document.getElementById("quick-nav");
  if (!container) return;

  const milestones = [
    { label: "Cancer history (start)", run: () => renderProband() },
    // Only milestone that lands on a populated review, so it must seed the fixed
    // relatives it displays (not just the steps strictly before it).
    { label: "Parents & grandparents", run: () => renderParentsReview(), seedTo: 2 },
    { label: "Siblings", run: () => renderGate("siblings") },
    { label: "Children", run: () => renderGate("children") },
    { label: "Maternal aunts & uncles", run: () => renderGate("maternalPiblings") },
    { label: "Paternal aunts & uncles", run: () => renderGate("paternalPiblings") },
    { label: "Other blood relatives", run: () => renderOtherGate() },
    { label: "Review hub", run: () => renderFinalHub() }
  ];

  const panel = document.createElement("div");
  panel.className = "quick-nav__panel";
  panel.innerHTML = `
    <p class="quick-nav__hint">Demo shortcut &mdash; jumping also fills the steps before it. Not part of the patient journey.</p>
  `;

  const list = document.createElement("div");
  list.className = "quick-nav__list";
  milestones.forEach((milestone, index) => {
    const link = document.createElement("button");
    link.type = "button";
    link.className = "quick-nav__link";
    link.innerHTML = `<span class="quick-nav__step">${index + 1}</span>${escapeHtml(milestone.label)}`;
    link.addEventListener("click", () => {
      list.querySelectorAll(".quick-nav__link").forEach(el => el.classList.remove("is-active"));
      link.classList.add("is-active");
      seedSectionsBefore(milestone.seedTo != null ? milestone.seedTo : index);
      milestone.run();
    });
    list.appendChild(link);
  });
  panel.appendChild(list);

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "quick-nav__reset";
  reset.textContent = "Reset prototype data";
  reset.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    state = createInitialState();
    runtime = {
      fixedIndex: 0,
      editingFixedId: null,
      currentGroup: null,
      currentIndex: 0,
      editingIndex: null,
      returnToHub: false,
      editToHub: false,
      otherTypeKey: "",
      otherEditingIndex: null
    };
    list.querySelectorAll(".quick-nav__link").forEach(el => el.classList.remove("is-active"));
    renderProband();
  });
  panel.appendChild(reset);

  const actions = document.createElement("div");
  actions.className = "quick-nav__actions";

  const fill = document.createElement("button");
  fill.type = "button";
  fill.className = "quick-nav__fill";
  fill.textContent = "Fill";
  fill.addEventListener("click", () => {
    fillCurrentScreen();
  });

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "quick-nav__toggle";
  toggle.textContent = "Jump to...";
  toggle.setAttribute("aria-expanded", "false");
  toggle.addEventListener("click", () => {
    const open = container.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  actions.appendChild(fill);
  actions.appendChild(toggle);

  container.appendChild(panel);
  container.appendChild(actions);
}

window.renderProband = renderProband;
window.saveProband = saveProband;
window.backFromProband = backFromProband;
window.renderFixedForm = renderFixedForm;
window.saveFixedPerson = saveFixedPerson;
window.backFromFixed = backFromFixed;
window.renderParentsReview = renderParentsReview;
window.continueAfterParents = continueAfterParents;
window.renderGate = renderGate;
window.continueFromGate = continueFromGate;
window.backFromGate = backFromGate;
window.renderCount = renderCount;
window.selectCount = selectCount;
window.stepCount = stepCount;
window.startRepeatGroup = startRepeatGroup;
window.renderRepeatForm = renderRepeatForm;
window.saveRepeatPerson = saveRepeatPerson;
window.backFromRepeat = backFromRepeat;
window.renderRepeatReview = renderRepeatReview;
window.addRepeatPerson = addRepeatPerson;
window.removeRepeatPerson = removeRepeatPerson;
window.continueAfterRepeatReview = continueAfterRepeatReview;
window.renderOtherGate = renderOtherGate;
window.continueFromOtherGate = continueFromOtherGate;
window.renderOtherReview = renderOtherReview;
window.renderOtherTypeSelect = renderOtherTypeSelect;
window.continueFromOtherType = continueFromOtherType;
window.backFromOtherType = backFromOtherType;
window.renderOtherForm = renderOtherForm;
window.backFromOtherForm = backFromOtherForm;
window.expandAnchorLabels = expandAnchorLabels;
window.collapseAnchorLabel = collapseAnchorLabel;
window.saveOtherPerson = saveOtherPerson;
window.editOtherPerson = editOtherPerson;
window.removeOtherPerson = removeOtherPerson;
window.continueAfterOtherReview = continueAfterOtherReview;
window.renderFinalHub = renderFinalHub;
window.submitFinalHub = submitFinalHub;
window.openGroupFromHub = openGroupFromHub;
window.openOtherFromHub = openOtherFromHub;
window.editFixedFromHub = editFixedFromHub;
window.editGroupFromHub = editGroupFromHub;
window.addGroupFromHub = addGroupFromHub;
window.removeGroupFromHub = removeGroupFromHub;
window.editOtherFromHub = editOtherFromHub;
window.addOtherFromHub = addOtherFromHub;
window.removeOtherFromHub = removeOtherFromHub;
window.toggleRowMenu = toggleRowMenu;
window.addDiagnosisRow = addDiagnosisRow;
window.removeDiagnosisRow = removeDiagnosisRow;
window.onDiagnosisTypeChange = onDiagnosisTypeChange;
window.onLateralityChange = onLateralityChange;
window.toggleCancerPanel = toggleCancerPanel;

// Boot last: every declaration above is now initialised.
init();
