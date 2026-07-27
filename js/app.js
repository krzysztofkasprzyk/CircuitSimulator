(function (App) {
  "use strict";

  var project;
  try { project = App.loadProject() || App.createExampleProject(); } catch (error) { project = App.createExampleProject(); }

  var mode = "edit";
  function emptySimulation() { return { relays: {}, runtime: {}, activeTransformers: new Set(), poweredComponents: new Set(), poweredWires: new Set(), stable: true, iterations: 0 }; }
  var lastSimulation = emptySimulation();
  var releasingButtons = new Set();

  function el(id) { return document.getElementById(id); }
  var elements = {
    palette: el("palette"), paletteSearch: el("palette-search"), paletteCount: el("palette-count"), tabs: el("tabs"), canvas: el("circuit-canvas"),
    wireLayer: el("wire-layer"), componentLayer: el("component-layer"), editMode: el("edit-mode"), simulateMode: el("simulate-mode"),
    modeStatus: el("mode-status"), simulationStatus: el("simulation-status"), panelControls: el("panel-controls"), message: el("message"),
    propertyForm: el("property-form"), emptySelection: el("empty-selection"), label: el("property-label"), relay: el("property-relay"),
    tag: el("property-tag"), buttonType: el("property-button-type"), delay: el("property-delay"), lampKind: el("property-lamp-kind"), burned: el("property-burned"),
    relayField: el("relay-field"), tagField: el("tag-field"), buttonField: el("button-field"), delayField: el("delay-field"),
    lampKindField: el("lamp-kind-field"), burnedField: el("burned-field"), description: el("component-description")
  };

  function notify(message) { elements.message.textContent = message; }
  function activeSheet() { return project.sheets.find(function (sheet) { return sheet.id === project.activeSheetId; }); }
  function setEqual(a, b) { return a.size === b.size && Array.from(a).every(function (value) { return b.has(value); }); }
  function visualStateChanged(a, b) {
    var keys = new Set(Object.keys(a.relays || {}).concat(Object.keys(b.relays || {})));
    return Array.from(keys).some(function (key) { return Boolean(a.relays[key]) !== Boolean(b.relays[key]); }) ||
      !setEqual(a.poweredComponents || new Set(), b.poweredComponents || new Set()) || !setEqual(a.poweredWires || new Set(), b.poweredWires || new Set());
  }

  var editor = new App.CircuitEditor({
    svg: elements.canvas, wireLayer: elements.wireLayer, componentLayer: elements.componentLayer,
    getProject: function () { return project; }, onChange: projectChanged, onSelectionChange: renderInspector, onComponentAction: activateButton
  });

  function refresh() {
    var previous = lastSimulation;
    lastSimulation = mode === "simulate" ? App.simulate(project, lastSimulation) : emptySimulation();
    if (mode !== "simulate" || visualStateChanged(previous, lastSimulation)) editor.setSimulation(lastSimulation);
    else editor.simulation = lastSimulation;
    renderTabs(); renderControlPanel();
    if (mode === "simulate") {
      var active = Object.keys(lastSimulation.relays).filter(function (key) { return lastSimulation.relays[key]; });
      elements.simulationStatus.textContent = lastSimulation.stable ? "Stan stabilny · aktywne: " + (active.join(", ") || "brak") : "Układ nie osiągnął stanu stabilnego";
    } else elements.simulationStatus.textContent = "Połącz elementy, następnie uruchom symulację";
  }

  function projectChanged(message) { App.saveProject(project); notify(message || "Zapisano zmianę."); refresh(); renderInspector(editor.selection); }

  function renderPalette() {
    var query = elements.paletteSearch.value.trim().toLocaleLowerCase("pl");
    elements.palette.replaceChildren(); var shown = 0;
    App.paletteGroups.forEach(function (family) {
      var types = App.paletteOrder.filter(function (type) {
        var definition = App.catalog[type];
        return definition.family === family && (!query || (definition.name + " " + definition.short + " " + definition.description).toLocaleLowerCase("pl").indexOf(query) !== -1);
      });
      if (!types.length) return;
      var group = document.createElement("section"); group.className = "palette-group";
      var title = document.createElement("h3"); title.textContent = family; group.appendChild(title);
      types.forEach(function (type) {
        var definition = App.catalog[type], button = document.createElement("button");
        button.type = "button"; button.className = "palette-button"; button.title = definition.description;
        button.appendChild(App.paletteIcon(type)); button.appendChild(document.createTextNode(definition.name));
        button.addEventListener("click", function () { if (mode !== "edit") setMode("edit"); editor.addComponent(type); });
        group.appendChild(button); shown += 1;
      });
      elements.palette.appendChild(group);
    });
    if (!shown) { var empty = document.createElement("p"); empty.className = "palette-empty"; empty.textContent = "Brak pasujących elementów."; elements.palette.appendChild(empty); }
    elements.paletteCount.textContent = shown + " / " + App.paletteOrder.length;
  }

  function renderTabs() {
    elements.tabs.replaceChildren();
    project.sheets.forEach(function (sheet, index) {
      var item = document.createElement("div"); item.className = "tab-item" + (sheet.id === project.activeSheetId ? " active" : "");
      var button = document.createElement("button"); button.type = "button"; button.className = "tab-button";
      button.textContent = (index + 1) + ". " + sheet.name; button.title = "Dwuklik: zmień nazwę";
      button.addEventListener("click", function () { project.activeSheetId = sheet.id; editor.selection = null; editor.pendingTerminal = null; renderInspector(null); App.saveProject(project); refresh(); });
      button.addEventListener("dblclick", function () { var name = window.prompt("Nazwa arkusza:", sheet.name); if (name && name.trim()) { sheet.name = name.trim(); projectChanged("Zmieniono nazwę arkusza."); } });
      item.appendChild(button);
      if (project.sheets.length > 1) {
        var close = document.createElement("button"); close.type = "button"; close.className = "tab-close"; close.textContent = "×"; close.title = "Usuń arkusz";
        close.addEventListener("click", function () {
          if (!window.confirm("Usunąć arkusz „" + sheet.name + "” wraz z jego elementami?")) return;
          project.sheets = project.sheets.filter(function (candidate) { return candidate.id !== sheet.id; });
          if (project.activeSheetId === sheet.id) project.activeSheetId = project.sheets[Math.max(0, index - 1)].id;
          editor.selection = null; projectChanged("Usunięto arkusz.");
        });
        item.appendChild(close);
      }
      elements.tabs.appendChild(item);
    });
  }

  function setMode(nextMode) {
    mode = nextMode; if (mode === "edit") lastSimulation = emptySimulation();
    editor.setMode(mode); elements.editMode.classList.toggle("active", mode === "edit"); elements.simulateMode.classList.toggle("active", mode === "simulate");
    elements.modeStatus.classList.toggle("simulating", mode === "simulate"); elements.modeStatus.lastChild.textContent = mode === "simulate" ? " Symulacja aktywna" : " Projektowanie";
    notify(mode === "simulate" ? "Symulacja uruchomiona — użyj pulpitu po prawej." : "Tryb projektowania aktywny."); refresh();
  }

  function releaseMomentary(component) {
    releasingButtons.delete(component.id); component.state = false; App.saveProject(project); refresh();
  }
  function activateButton(component, phase, value) {
    if (component.buttonType === "threePosition") {
      if (phase === "down") component.state = Number(value) || 0;
    } else if (component.buttonType === "stable") {
      if (phase === "down") component.state = !component.state;
    } else {
      component.state = phase === "down";
      if (phase === "down" && !releasingButtons.has(component.id)) {
        releasingButtons.add(component.id); window.addEventListener("pointerup", function () { releaseMomentary(component); }, { once: true });
      }
    }
    App.saveProject(project); refresh();
  }

  function renderControlPanel() {
    elements.panelControls.replaceChildren(); var buttons = [];
    project.sheets.forEach(function (sheet) { sheet.components.filter(function (c) { return c.type === "button"; }).forEach(function (component) { buttons.push({ sheet: sheet, component: component }); }); });
    if (!buttons.length) { var empty = document.createElement("p"); empty.className = "empty-state"; empty.textContent = "Dodaj przycisk lub przełącznik do schematu."; elements.panelControls.appendChild(empty); return; }
    buttons.forEach(function (item) {
      var row = document.createElement("div"); row.className = "panel-control";
      var label = document.createElement("span"); label.textContent = item.component.label;
      var small = document.createElement("small"); small.textContent = item.sheet.name; label.appendChild(small); row.appendChild(label);
      if (item.component.buttonType === "threePosition") {
        var group = document.createElement("div"); group.className = "three-buttons";
        [-1, 0, 1].forEach(function (value) { var b = document.createElement("button"); b.type = "button"; b.textContent = value < 0 ? "−" : value > 0 ? "+" : "0"; b.className = Number(item.component.state) === value ? "on" : ""; b.addEventListener("click", function () { activateButton(item.component, "down", value); }); group.appendChild(b); });
        row.appendChild(group);
      } else {
        var button = document.createElement("button"); button.type = "button"; button.className = item.component.state ? "on" : "";
        button.textContent = item.component.state ? "ZAŁ." : (item.component.buttonType === "stable" ? "WYŁ." : item.component.buttonType === "pull" ? "WYCIĄGNIJ" : "WCIŚNIJ");
        if (item.component.buttonType === "stable") button.addEventListener("click", function () { activateButton(item.component, "down"); });
        else button.addEventListener("pointerdown", function () { activateButton(item.component, "down"); });
        row.appendChild(button);
      }
      elements.panelControls.appendChild(row);
    });
  }

  function renderInspector(selection) {
    var component = selection && selection.kind === "component" ? editor.selectedComponent() : null, wire = selection && selection.kind === "wire";
    elements.emptySelection.hidden = Boolean(component || wire); elements.propertyForm.hidden = !(component || wire);
    if (!component) { elements.label.parentElement.hidden = true; elements.relayField.hidden = true; elements.tagField.hidden = true; elements.buttonField.hidden = true; elements.delayField.hidden = true; elements.lampKindField.hidden = true; elements.burnedField.hidden = true; elements.description.hidden = true; return; }
    elements.label.parentElement.hidden = false; elements.label.value = component.label || "";
    elements.relayField.hidden = !(App.isCoilType(component.type) || App.isContactType(component.type) || component.type === "lamp"); elements.relay.value = component.relay || "";
    elements.tagField.hidden = component.type !== "connector"; elements.tag.value = component.tag || "";
    elements.buttonField.hidden = component.type !== "button"; elements.buttonType.value = component.buttonType || "push";
    elements.delayField.hidden = ["coilOnDelay", "coilOffDelay", "auxCoilOffDelay", "lightCoilOffDelay"].indexOf(component.type) === -1; elements.delay.value = component.delayMs || 1000;
    elements.lampKindField.hidden = component.type !== "lamp"; elements.lampKind.value = component.lampKind || "lamp";
    elements.burnedField.hidden = component.type !== "lamp"; elements.burned.checked = Boolean(component.burned);
    elements.description.hidden = false; elements.description.textContent = App.catalog[component.type].description;
  }

  function updateSelected(property, value, message) { var component = editor.selectedComponent(); if (!component) return; component[property] = value; projectChanged(message); }
  elements.label.addEventListener("input", function () { updateSelected("label", elements.label.value, "Zmieniono nazwę elementu."); });
  elements.relay.addEventListener("input", function () { updateSelected("relay", elements.relay.value.trim(), "Zmieniono oznaczenie funkcjonalne."); });
  elements.tag.addEventListener("input", function () { updateSelected("tag", elements.tag.value.trim().toUpperCase(), "Zmieniono łącznik arkuszy."); });
  elements.buttonType.addEventListener("change", function () { var component = editor.selectedComponent(); if (component) component.state = elements.buttonType.value === "threePosition" ? 0 : false; updateSelected("buttonType", elements.buttonType.value, "Zmieniono typ sterowania."); });
  elements.delay.addEventListener("change", function () { updateSelected("delayMs", Math.max(0, Number(elements.delay.value) || 0), "Zmieniono czas zwłoki."); });
  elements.lampKind.addEventListener("change", function () { updateSelected("lampKind", elements.lampKind.value, "Zmieniono źródło światła."); });
  elements.burned.addEventListener("change", function () { updateSelected("burned", elements.burned.checked, "Zmieniono stan źródła światła."); });
  elements.paletteSearch.addEventListener("input", renderPalette);
  elements.editMode.addEventListener("click", function () { setMode("edit"); }); elements.simulateMode.addEventListener("click", function () { setMode("simulate"); });
  el("reset-simulation").addEventListener("click", function () { lastSimulation = emptySimulation(); project.sheets.forEach(function (sheet) { sheet.components.filter(function (c) { return c.type === "button"; }).forEach(function (c) { c.state = c.buttonType === "threePosition" ? 0 : false; }); }); App.saveProject(project); refresh(); notify("Wyzerowano pamięć i elementy sterujące."); });
  el("delete-selection").addEventListener("click", function () { editor.deleteSelection(); });
  document.addEventListener("keydown", function (event) { if ((event.key === "Delete" || event.key === "Backspace") && ["INPUT", "SELECT", "TEXTAREA"].indexOf(event.target.tagName) === -1) editor.deleteSelection(); });
  el("add-sheet").addEventListener("click", function () { var sheet = App.createSheet("Arkusz " + (project.sheets.length + 1)); project.sheets.push(sheet); project.activeSheetId = sheet.id; editor.selection = null; projectChanged("Dodano nowy arkusz."); });
  el("clear-sheet").addEventListener("click", function () { if (!window.confirm("Usunąć wszystkie elementy z aktywnego arkusza?")) return; activeSheet().components = []; activeSheet().wires = []; editor.selection = null; projectChanged("Wyczyszczono arkusz."); });
  el("fit-example").addEventListener("click", function () { if (!window.confirm("Zastąpić bieżący projekt przykładem?")) return; project = App.createExampleProject(); editor.selection = null; lastSimulation = emptySimulation(); setMode("edit"); projectChanged("Wczytano projekt przykładowy."); });
  el("save-project").addEventListener("click", function () { App.saveProject(project); notify("Projekt zapisano lokalnie."); });
  el("export-project").addEventListener("click", function () { App.downloadProject(project); notify("Pobrano projekt JSON."); });
  el("import-project").addEventListener("change", function (event) { var file = event.target.files[0]; if (!file) return; App.readProjectFile(file).then(function (loaded) { project = loaded; editor.selection = null; lastSimulation = emptySimulation(); setMode("edit"); projectChanged("Zaimportowano projekt."); }).catch(function (error) { notify("Błąd importu: " + error.message); }); event.target.value = ""; });

  window.setInterval(function () { if (mode === "simulate") refresh(); }, 100);
  renderPalette(); renderInspector(null); setMode("edit");
}(window.CircuitApp = window.CircuitApp || {}));
