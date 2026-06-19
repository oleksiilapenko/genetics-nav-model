/*
  Genetics self-assessment prototype

  This is intentionally dependency-free. The UI is a prototype, but the state
  is record-first: relative records persist independently of the screens used
  to create them. Dev-facing mapping notes live in prototype-notes.md.
*/

const STORAGE_KEY = "cts-genetics-nav-prototype-v1";
const MIN_PARENT_AGE = 12;
const PROBAND_BIRTH_YEAR = "1983";

const cancerTypes = [
  "Breast cancer",
  "Ovarian cancer",
  "Bowel cancer",
  "Prostate cancer",
  "Pancreatic cancer",
  "Lung cancer",
  "Other cancer",
  "Not sure"
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
  otherTypeKey: "",
  otherEditingIndex: null
};

const app = document.getElementById("app");

init();

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
    ${buttonBar(fromReview ? "Return to review" : "Back", "saveFixedPerson()", "backFromFixed()", fromReview ? "Save changes" : "Continue")}
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
  const rows = fixedDefs.map(def => reviewRow(state.fixed[def.id], {
    fixedDef: def,
    change: `renderFixedForm('${def.id}', true, ${fromHub})`,
    removable: false
  })).join("");

  setScreen(`
    <h1>Review parents and grandparents</h1>
    <p class="lead">Check these details before you continue.</p>
    <div class="review-list">${rows}</div>
    ${buttonBar("", "continueAfterParents()", "", fromHub ? "Return to family history review" : "Continue")}
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
  const moreValue = group.count && group.count > 5 ? group.count : 6;

  const control = moreMode
    ? `
    <div class="stepper-row" role="group" aria-label="${escapeAttr(def.countTitle)}">
      <button type="button" class="stepper-button" onclick="stepCount('${groupKey}', -1)" aria-label="Fewer">&minus;</button>
      <label class="sr-only" for="${groupKey}MoreCount">How many</label>
      <input class="stepper-input" id="${groupKey}MoreCount" type="number" min="6" max="20" inputmode="numeric" value="${moreValue}">
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
  input.value = String(Math.max(6, Math.min(20, Number(input.value || 6) + delta)));
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

function renderRepeatForm(groupKey, index, editing = false, fromHub = false) {
  const def = groupDefs[groupKey];
  const group = state.groups[groupKey];
  const person = group.items[index] || createGroupPerson(groupKey, index);
  runtime.currentGroup = groupKey;
  runtime.currentIndex = index;
  runtime.editingIndex = editing ? index : null;
  runtime.returnToHub = fromHub;

  setScreen(`
    <h1>${editing ? `Change ${escapeHtml(def.singular)} details` : `${escapeHtml(def.label)} #${index + 1}`}</h1>
    <p class="lead">${escapeHtml(def.formLead)}</p>
    <p class="muted">Add what you know. Estimates are fine. You can skip optional questions if you're not sure.</p>
    ${personFields("repeat", person, { showSex: true, showSiblingShare: groupKey === "siblings" })}
    ${buttonBar(editing ? "Return to review" : "Back", "saveRepeatPerson()", "backFromRepeat()", editing ? "Save changes" : "Continue")}
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
  assignGroupPedigree(groupKey);
  saveState();

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
  const def = groupDefs[groupKey];
  const group = state.groups[groupKey];
  const rows = group.items.length
    ? group.items.map((person, index) => reviewRow(person, {
      groupKey,
      change: `renderRepeatForm('${groupKey}', ${index}, true, ${fromHub})`,
      remove: `removeRepeatPerson('${groupKey}', ${index})`,
      removable: true
    })).join("")
    : `<div class="empty-state">You said you do not have any ${escapeHtml(def.title)}.</div>`;

  setScreen(`
    <h1>${escapeHtml(def.reviewTitle)}</h1>
    <p class="lead">${group.items.length ? `You added ${group.items.length} ${group.items.length === 1 ? def.singular : def.title}. Check these details before you continue.` : `You said you do not have any ${def.title}.`}</p>
    <div class="review-list">${rows}</div>
    <div class="list-add">
      <button class="button secondary" onclick="addRepeatPerson('${groupKey}')">${escapeHtml(def.addLabel)}</button>
    </div>
    ${buttonBar("", `continueAfterRepeatReview('${groupKey}')`, "", fromHub ? "Return to family history review" : "Continue")}
  `, "review-card");
}

function addRepeatPerson(groupKey) {
  const group = state.groups[groupKey];
  group.has = "Yes";
  group.items.push(createGroupPerson(groupKey, group.items.length));
  group.count = group.items.length;
  saveState();
  renderRepeatForm(groupKey, group.items.length - 1, true);
}

function removeRepeatPerson(groupKey, index) {
  const group = state.groups[groupKey];
  const person = group.items[index];
  if (!confirm(`Remove ${person.name || groupDefs[groupKey].singular}? This will remove the details you added.`)) return;
  group.items.splice(index, 1);
  group.count = group.items.length;
  assignGroupPedigree(groupKey);
  saveState();
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
      <p>This may include:</p>
      <ul>
        <li>grandchildren or great-grandchildren</li>
        <li>first cousins</li>
        <li>great-aunts or great-uncles</li>
        <li>nieces or nephews</li>
        <li>great-nieces or great-nephews</li>
        <li>great-grandparents</li>
      </ul>
      <p>You do not need to add everyone in your family – only relatives who have been diagnosed with cancer.</p>
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
  renderOtherReview();
}

function renderOtherReview(fromHub = false) {
  runtime.returnToHub = fromHub;
  const rows = state.other.items.length
    ? state.other.items.map((person, index) => reviewRow(person, {
      change: `editOtherPerson(${index}, ${fromHub})`,
      remove: `removeOtherPerson(${index})`,
      removable: true
    })).join("")
    : `<div class="empty-state">No relatives added yet.</div>`;

  setScreen(`
    <h1>Other blood relatives with cancer</h1>
    <p class="lead">Add any other blood relatives who have been diagnosed with cancer. Add one relative at a time.</p>
    <div class="review-list">${rows}</div>
    <div class="list-add">
      <button class="button secondary" onclick="renderOtherTypeSelect()">Add relative with cancer</button>
    </div>
    ${buttonBar("", "continueAfterOtherReview()", "", fromHub ? "Return to family history review" : "Continue")}
  `, "review-card");
}

function renderOtherTypeSelect() {
  const available = availableOtherTypes();
  setScreen(`
    <h1>Which relative would you like to add?</h1>
    <p class="lead muted">Only add relatives who have been diagnosed with cancer.</p>
    <p class="muted">Add one relative at a time. You can add another relative afterwards.</p>
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
    ${buttonBar("Back", "continueFromOtherType()", "renderOtherReview()")}
  `);
}

function availableOtherTypes() {
  return otherTypeDefs.filter(type => type.anchors().length > 0);
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
    typeKey,
    cancer: "Yes"
  });
}

function renderOtherForm(person) {
  const type = otherTypeDefs.find(item => item.key === person.typeKey);
  const anchors = type.anchors();
  runtime.otherTypeKey = person.typeKey;
  setScreen(`
    <h1>${escapeHtml(type.label)} #${sequenceForOther(person)}</h1>
    <p class="lead">${escapeHtml(type.lead)}</p>
    <p class="muted">Add what you know. Estimates are fine. You can skip optional questions if you're not sure.</p>
    <div class="field">
      <label for="otherName">Name</label>
      <input id="otherName" type="text" value="${escapeAttr(person.name)}" autocomplete="off">
    </div>
    <div class="field">
      <label for="otherAnchor">${escapeHtml(type.anchorQuestion)}</label>
      <select id="otherAnchor">
        ${anchors.map(anchor => `<option value="${escapeAttr(anchor.recordId)}" ${person.anchorId === anchor.recordId ? "selected" : ""}>${escapeHtml(anchorLabel(anchor))}</option>`).join("")}
      </select>
    </div>
    ${sexField("other", person.sex)}
    ${yearField("otherBirthYear", person.birthYear)}
    ${livingField("other", person.living, person.yearOfDeath)}
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
    ${buttonBar("Back", "saveOtherPerson()", "renderOtherReview()", runtime.otherEditingIndex !== null ? "Save changes" : "Continue")}
  `);
}

function saveOtherPerson() {
  if (!validatePersonForm("other", { showSex: true, showSiblingShare: false, hasCancerRadio: false })) return;
  const type = otherTypeDefs.find(item => item.key === runtime.otherTypeKey);
  const existing = runtime.otherEditingIndex === null
    ? blankOtherPerson(runtime.otherTypeKey)
    : state.other.items[runtime.otherEditingIndex];
  const person = {
    ...existing,
    relationship: type.label,
    name: value("otherName"),
    anchorId: value("otherAnchor"),
    sex: getRadio("otherSex"),
    birthYear: value("otherBirthYear"),
    living: getRadio("otherLiving"),
    yearOfDeath: getRadio("otherLiving") === "Died" ? value("otherDeathYear") : "",
    cancer: "Yes",
    diagnoses: readDiagnoses("other"),
    treatedWhere: value("otherTreatedWhere"),
    notes: value("otherNotes")
  };
  assignOtherParentLinks(person);
  if (runtime.otherEditingIndex === null) {
    state.other.items.push(person);
  } else {
    state.other.items[runtime.otherEditingIndex] = person;
  }
  state.other.has = "Yes";
  saveState();
  renderOtherReview(runtime.returnToHub);
}

function editOtherPerson(index, fromHub = false) {
  runtime.otherEditingIndex = index;
  runtime.returnToHub = fromHub;
  renderOtherForm(state.other.items[index]);
}

function removeOtherPerson(index) {
  const person = state.other.items[index];
  if (!confirm(`Remove ${person.name || person.relationship}? This will remove the details you added.`)) return;
  state.other.items.splice(index, 1);
  saveState();
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

function renderFinalHub() {
  const rows = [
    hubRow("You", probandSummary(), "renderProband(true)", probandTags()),
    hubRow("Parents and grandparents", `${fixedDefs.length} relatives`, "renderParentsReview(true)", sectionTagsForPeople(fixedDefs.map(def => state.fixed[def.id]))),
    hubRow("Siblings", groupSummary("siblings"), "openGroupFromHub('siblings')", groupTags("siblings")),
    hubRow("Children", groupSummary("children"), "openGroupFromHub('children')", groupTags("children")),
    hubRow("Maternal aunts and uncles", groupSummary("maternalPiblings"), "openGroupFromHub('maternalPiblings')", groupTags("maternalPiblings")),
    hubRow("Paternal aunts and uncles", groupSummary("paternalPiblings"), "openGroupFromHub('paternalPiblings')", groupTags("paternalPiblings")),
    hubRow("Other blood relatives with cancer", otherSummary(), "openOtherFromHub()", otherTags())
  ].join("");

  setScreen(`
    <h1>Review your family history</h1>
    <p class="lead muted">Open a section to check or change the details before continuing.</p>
    <div class="hub-list">${rows}</div>
    <div class="button-bar">
      <button class="link-button" onclick="renderOtherReview()">Back</button>
      <button class="button" onclick="alert('That is the end of the prototype. In the real service, this would submit your answers.')">Confirm and continue</button>
    </div>
  `, "hub-card");
}

function openGroupFromHub(groupKey) {
  const group = state.groups[groupKey];
  if (!group.has) renderGate(groupKey, true);
  else renderRepeatReview(groupKey, true);
}

function openOtherFromHub() {
  if (!state.other.has) renderOtherGate(true);
  else renderOtherReview(true);
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
        ${rows.map((diagnosis, index) => diagnosisRow(prefix, diagnosis, index)).join("")}
      </div>
      <button class="link-button primary-link" onclick="addDiagnosisRow('${prefix}')">+ Add another cancer diagnosis</button>
    </div>
  `;
}

function diagnosisRow(prefix, diagnosis = {}, index = 0) {
  return `
    <div class="diagnosis-group" data-diagnosis-row>
      <div class="diagnosis-field">
        <label for="${prefix}CancerType${index}" class="label">Cancer type</label>
        ${errorSlot(`${prefix}CancerType${index}Error`)}
        <select id="${prefix}CancerType${index}" data-diagnosis-type>
          <option value="">Select a cancer type</option>
          ${cancerTypes.map(type => `<option value="${escapeAttr(type)}" ${diagnosis.type === type ? "selected" : ""}>${escapeHtml(type)}</option>`).join("")}
        </select>
      </div>
      <div class="diagnosis-field">
        <label for="${prefix}CancerAge${index}" class="label">Age at diagnosis</label>
        ${errorSlot(`${prefix}CancerAge${index}Error`)}
        <input class="short-input" id="${prefix}CancerAge${index}" data-diagnosis-age type="number" inputmode="numeric" min="0" max="125" value="${escapeAttr(diagnosis.age || "")}">
      </div>
      <button class="link-button danger remove-diagnosis" type="button" onclick="removeDiagnosisRow(this)">Remove this cancer</button>
    </div>
  `;
}

function addDiagnosisRow(prefix) {
  const root = document.getElementById(`${prefix}DiagnosisRows`);
  const index = root.querySelectorAll("[data-diagnosis-row]").length;
  root.insertAdjacentHTML("beforeend", diagnosisRow(prefix, {}, index));
}

function removeDiagnosisRow(button) {
  const root = button.closest("[id$='DiagnosisRows']");
  if (root.querySelectorAll("[data-diagnosis-row]").length === 1) {
    button.closest("[data-diagnosis-row]").querySelector("[data-diagnosis-type]").value = "";
    button.closest("[data-diagnosis-row]").querySelector("[data-diagnosis-age]").value = "";
    return;
  }
  button.closest("[data-diagnosis-row]").remove();
}

function readDiagnoses(prefix) {
  const root = document.getElementById(`${prefix}DiagnosisRows`);
  if (!root) return [];
  return Array.from(root.querySelectorAll("[data-diagnosis-row]")).map(row => ({
    type: row.querySelector("[data-diagnosis-type]").value,
    age: row.querySelector("[data-diagnosis-age]").value.trim()
  })).filter(item => item.type || item.age);
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
  return `
    <div class="button-bar">
      ${backText ? `<button class="link-button" onclick="${backAction}">${escapeHtml(backText)}</button>` : "<span></span>"}
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
    return FRIENDLY_GROUP[groupKey][person.sex] || null;
  }
  return null;
}

function reviewRow(person, opts) {
  const tags = tagsForPerson(person);
  const role = opts.fixedDef
    ? (opts.fixedDef.displayTitle || opts.fixedDef.title)
    : (friendlyRelation(person, opts) || person.relationship || person.pedigreeId || "Relative");
  const title = person.name ? `${person.name} — ${role}` : role;
  const meta = personMeta(person);
  return `
    <article class="review-row">
      <div>
        <div class="row-title">${escapeHtml(title)}</div>
        <div class="row-meta">${escapeHtml(meta)}</div>
        <div class="status-line">${tags.map(tagHtml).join("")}</div>
      </div>
      <div class="row-actions">
        <button class="link-button primary-link" onclick="${opts.change}">Change</button>
        ${opts.removable ? `<button class="link-button danger" onclick="${opts.remove}">Remove</button>` : ""}
      </div>
    </article>
  `;
}

function hubRow(title, meta, action, tags) {
  return `
    <article class="hub-row">
      <div>
        <div class="row-title">${escapeHtml(title)}</div>
        <div class="row-meta">${escapeHtml(meta)}</div>
        <div class="status-line">${tags.map(tagHtml).join("")}</div>
      </div>
      <div class="row-actions">
        <button class="link-button primary-link" onclick="${action}">Review</button>
      </div>
    </article>
  `;
}

function personMeta(person) {
  const bits = [];
  if (person.relationship) bits.push(person.relationship);
  if (person.sex) bits.push(person.sex);
  bits.push(lifespanText(person));
  if (person.cancer === "Yes" || person.diagnoses.length) {
    bits.push(person.diagnoses.length ? diagnosisText(person.diagnoses) : "cancer reported");
  } else if (person.cancer === "No") {
    bits.push("no cancer reported");
  } else if (person.cancer === "Not sure") {
    bits.push("not sure about cancer");
  } else {
    bits.push("cancer history not added");
  }
  return bits.join(" · ");
}

// Compact lifespan for review summaries: "1934–2002" when deceased with a known
// year of death, "b. 1958" while alive. Uses an en dash for the year range.
function lifespanText(person) {
  const born = person.birthYear;
  const died = person.living === "Died";
  const yod = person.yearOfDeath;
  if (born && died) return yod ? `${born}–${yod}` : `b. ${born} · died`;
  if (born) return `b. ${born}`;
  if (died) return yod ? `d. ${yod}` : "died";
  return "YOB not added";
}

function diagnosisText(diagnoses) {
  return diagnoses.map(item => `${item.type || "Cancer"}${item.age ? ` at ${item.age}` : ""}`).join("; ");
}

function tagsForPerson(person) {
  const tags = [];
  const missing = missingFields(person);
  const issues = ageIssuesForPerson(person);
  const approximations = approximationFlags(person);
  missing.forEach(item => tags.push({ label: item, type: "warn" }));
  approximations.forEach(item => tags.push({ label: item, type: "warn" }));
  issues.forEach(item => tags.push({ label: item, type: "warn" }));
  return tags;
}

function missingFields(person) {
  const missing = [];
  if (!person.birthYear) missing.push("YOB missing");
  if (!person.living) missing.push("Living status missing");
  if (person.cancer !== "Yes" && person.cancer !== "No" && person.cancer !== "Not sure") missing.push("Cancer answer missing");
  if (!person.sex) missing.push("Sex missing");
  return missing;
}

function approximationFlags(person) {
  const flags = [];
  if (person.cancer === "Yes" && person.diagnoses.some(item => item.type && !item.age)) {
    flags.push("Age at diagnosis missing");
  }
  if (person.cancer === "Yes" && !person.diagnoses.length) {
    flags.push("Cancer details missing");
  }
  return flags;
}

/*
  Age-conflict detection across all parent/child links (not just the proband's
  children). A pair conflicts when the child's birth year is fewer than
  MIN_PARENT_AGE years after the parent's. Conflicts are non-blocking: they
  surface as an amber "Check birth years" flag on BOTH the child's and the
  parent's review rows, so a wrong year on either record is easy to spot.
*/
function ageIssuesForPerson(person) {
  const conflict = parentChildEdges().some(({ parent, child }) => {
    if (person.recordId !== parent.recordId && person.recordId !== child.recordId) return false;
    const parentYob = toYear(parent.birthYear);
    const childYob = toYear(child.birthYear);
    return parentYob && childYob && childYob - parentYob < MIN_PARENT_AGE;
  });
  return conflict ? ["Check birth years"] : [];
}

/*
  Real parent -> child links derived from each person's parentIds. Synthetic
  placeholders (unknown spouses "USF#"/"USM#"/"UP1", "other" partners "U-…")
  resolve to nobody and are skipped. The proband is resolved via the pedigree
  id "P" that their children point at. greatGrandparent stores the grandparent
  it is the parent of, so that edge is added in the parent->child direction.
*/
function parentChildEdges() {
  const edges = [];
  const add = (parent, child) => {
    if (parent && child && parent.recordId !== child.recordId) edges.push({ parent, child });
  };
  allPeople().forEach(person => {
    const ids = person.parentIds || {};
    ["father", "mother", "parent", "knownParent"].forEach(key => {
      if (ids[key]) add(findPersonByPedigreeId(ids[key]), person);
    });
    if (ids.parentOf) add(person, findPersonByPedigreeId(ids.parentOf));
  });
  return edges;
}

function probandAsPerson() {
  return { ...state.proband, recordId: "proband", pedigreeId: "P", relationship: "You" };
}

function sectionTagsForPeople(people) {
  const allTags = people.flatMap(tagsForPerson);
  return summarizeTags(allTags);
}

function groupTags(groupKey) {
  const group = state.groups[groupKey];
  if (!group.has) return [{ label: "Not answered", type: "warn" }];
  if (group.has === "No") return [];
  return sectionTagsForPeople(group.items);
}

function probandTags() {
  if (!state.proband.cancer) return [{ label: "Not answered", type: "warn" }];
  if (state.proband.cancer === "Yes" && !state.proband.diagnoses.length) return [{ label: "Cancer details missing", type: "warn" }];
  return [];
}

function summarizeTags(tags) {
  const conflicts = tags.filter(tag => tag.type === "danger").length;
  const warnings = tags.filter(tag => tag.type === "warn").length;
  if (conflicts) return [{ label: `${conflicts} conflict${conflicts === 1 ? "" : "s"}`, type: "danger" }];
  if (warnings) return [{ label: `${warnings} item${warnings === 1 ? "" : "s"} to check`, type: "warn" }];
  return [];
}

function tagHtml(tag) {
  return `<span class="tag ${tag.type || ""}">${escapeHtml(tag.label)}</span>`;
}

function probandSummary() {
  if (!state.proband.cancer) return "Not answered";
  if (state.proband.cancer === "Yes") return state.proband.diagnoses.length ? diagnosisText(state.proband.diagnoses) : "You have been diagnosed with cancer";
  if (state.proband.cancer === "Not sure") return "You're not sure if you've been diagnosed with cancer";
  return "You have not been diagnosed with cancer";
}

function groupSummary(groupKey) {
  const group = state.groups[groupKey];
  const def = groupDefs[groupKey];
  if (!group.has) return "Not answered";
  if (group.has === "No") return `You said you do not have any ${def.title}`;
  return `${group.items.length} ${group.items.length === 1 ? def.singular : def.title} added`;
}

function otherSummary() {
  if (!state.other.has) return "Not answered";
  if (state.other.has === "No") return "You said you do not know any";
  return `${state.other.items.length} ${state.other.items.length === 1 ? "relative" : "relatives"} added`;
}

function otherTags() {
  if (!state.other.has) return [{ label: "Not answered", type: "warn" }];
  if (state.other.has === "No") return [];
  if (!state.other.items.length) return [{ label: "No relatives added yet", type: "warn" }];
  return sectionTagsForPeople(state.other.items);
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

function anchorLabel(person) {
  const name = person.name || friendlyRelation(person) || person.relationship || person.pedigreeId;
  const details = [person.sex, person.birthYear ? `YOB ${person.birthYear}` : ""].filter(Boolean).join(", ");
  return `${name}${details ? ` – ${details}` : ""}`;
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
  const { showSex = false, showSiblingShare = false, hasCancerRadio = true } = opts;
  clearPersonErrors();
  const errors = [];

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

function validateDiagnoses(prefix) {
  const errors = [];
  const root = document.getElementById(`${prefix}DiagnosisRows`);
  if (!root) return errors;
  const rows = Array.from(root.querySelectorAll("[data-diagnosis-row]"));
  let anyType = false;
  let anyAge = false;
  rows.forEach(row => {
    const typeEl = row.querySelector("[data-diagnosis-type]");
    const ageEl = row.querySelector("[data-diagnosis-age]");
    const type = typeEl.value.trim();
    const age = ageEl.value.trim();
    if (type) anyType = true;
    if (age) anyAge = true;
    if (age && !type) {
      errors.push([`${typeEl.id}Error`, "Add the cancer type for this age."]);
    }
    if (age && (!/^\d+$/.test(age) || Number(age) < 0 || Number(age) > 125)) {
      errors.push([`${ageEl.id}Error`, "Enter an age from 0 to 125."]);
    }
  });
  if (!anyType && !anyAge && rows[0]) {
    const firstType = rows[0].querySelector("[data-diagnosis-type]");
    if (firstType) errors.push([`${firstType.id}Error`, "Add at least one cancer type."]);
  }
  return errors;
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
  mother: { name: "Susan", birthYear: "1958", living: "Alive", cancer: "Yes", diagnoses: [{ type: "Breast cancer", age: "49" }], treatedWhere: "Poole Hospital" },
  mgm: { name: "Margaret", birthYear: "1934", living: "Died", yearOfDeath: "2002", cancer: "Yes", diagnoses: [{ type: "Breast cancer", age: "61" }, { type: "Ovarian cancer", age: "66" }] },
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
  { typeKey: "grandAuntUncle", name: "Edith", sex: "Female", birthYear: "1930", living: "Died", yearOfDeath: "2001", diagnoses: [{ type: "Breast cancer", age: "67" }], anchorRecordId: "mgm" }
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
  root.querySelectorAll("[data-diagnosis-row]").forEach(row => {
    const type = row.querySelector("[data-diagnosis-type]");
    const age = row.querySelector("[data-diagnosis-age]");
    if (type && !type.value) type.value = pick(["Breast cancer", "Bowel cancer", "Ovarian cancer", "Prostate cancer"]);
    if (age && !age.value.trim()) age.value = String(45 + Math.floor(Math.random() * 30));
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
  } else {
    // "Other blood relatives" form has no cancer question — they always have cancer.
    fillDiagnosisRows(prefix);
  }
}

function fillCurrentScreen() {
  if (document.querySelector('input[name="probandCancer"]')) {
    fillPersonScreen("proband", { showSex: false, hasCancerRadio: true, sexForName: "" });
  } else if (document.getElementById("otherName")) {
    fillPersonScreen("other", { showSex: true, hasCancerRadio: false, birthYear: currentOtherBirthYear() });
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
window.renderOtherForm = renderOtherForm;
window.saveOtherPerson = saveOtherPerson;
window.editOtherPerson = editOtherPerson;
window.removeOtherPerson = removeOtherPerson;
window.continueAfterOtherReview = continueAfterOtherReview;
window.renderFinalHub = renderFinalHub;
window.openGroupFromHub = openGroupFromHub;
window.openOtherFromHub = openOtherFromHub;
window.addDiagnosisRow = addDiagnosisRow;
window.removeDiagnosisRow = removeDiagnosisRow;
window.toggleCancerPanel = toggleCancerPanel;
