(function (App) {
  "use strict";

  var project;
  try { project = App.loadProject() || App.createExampleProject(); }
  catch (error) { project = App.createExampleProject(); }

  var mode = "edit";
  var emptySimulation = { relays: {}, poweredComponents: new Set(), poweredWires: new Set(), stable: true, iterations: 0 };
  var lastSimulation = emptySimulation;
  var releasingButtons = new Set();

  var elements = {
    palette: document.getElementById("palette"),
    tabs: document.getElementById("tabs"),
    canvas: document.getElementById("circuit-canvas"),
    wireLayer: document.getElementById("wire-layer"),
    componentLayer: document.getElementById("component-layer"),
    editMode: document.getElementById("edit-mode"),
    simulateMode: document.getElementById("simulate-mode"),
    modeStatus: document.getElementById("mode-status"),
    simulationStatus: document.getElementById("simulation-status"),
    panelControls: document.getElementById("panel-controls"),
    message: document.getElementById("message"),
    propertyForm: document.getElementById("property-form"),
    emptySelection: document.getElementById("empty-selection"),
    label: document.getElementById("property-label"),
    relay: document.getElementById("property-relay"),
    tag: document.getElementById("property-tag"),
    buttonType: document.getElementById("property-button-type"),
    burned: document.getElementById("property-burned"),
    relayField: document.getElementById("relay-field"),
    tagField: document.getElementById("tag-field"),
    buttonField: document.getElementById("button-field"),
    burnedField: document.getElementById("burned-field")
  };

  function notify(message) {
    elements.message.textContent = message;
  }

  function activeSheet() {
    return project.sheets.find(function (sheet) { return sheet.id === project.activeSheetId; });
  }

  var editor = new App.CircuitEditor({
    svg: elements.canvas,
    wireLayer: elements.wireLayer,
    componentLayer: elements.componentLayer,
    getProject: function () { return project; },
    onChange: projectChanged,
    onSelectionChange: renderInspector,
    onComponentAction: activateButton
  });

  /** Przelicza symulację i odświeża wszystkie części interfejsu. */
  function refresh() {
    var result = mode === "simulate" ? App.simulate(project, lastSimulation.relays) : emptySimulation;
    lastSimulation = result;
    editor.setSimulation(result);
    renderTabs();
    renderControlPanel();
    if (mode === "simulate") {
      var activeRelayCount = Object.keys(result.relays).filter(function (key) { return result.relays[key]; }).length;
      elements.simulationStatus.textContent = result.stable
        ? "Stan stabilny · aktywne przekaźniki: " + activeRelayCount
        : "Uwaga: układ nie osiągnął stabilnego stanu";
    } else {
      elements.simulationStatus.textContent = "Połącz elementy, a następnie uruchom symulację";
    }
  }

  /** Reaguje na modyfikację projektu i wykonuje automatyczny zapis lokalny. */
  function projectChanged(message) {
    App.saveProject(project);
    notify(message || "Zapisano zmianę.");
    refresh();
    renderInspector(editor.selection);
  }

  function renderPalette() {
    elements.palette.replaceChildren();
    App.paletteOrder.forEach(function (type) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "palette-button";
      button.appendChild(App.paletteIcon(type));
      button.appendChild(document.createTextNode(App.catalog[type].name));
      button.addEventListener("click", function () {
        if (mode !== "edit") setMode("edit");
        editor.addComponent(type);
      });
      elements.palette.appendChild(button);
    });
  }

  function renderTabs() {
    elements.tabs.replaceChildren();
    project.sheets.forEach(function (sheet) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "tab-button" + (sheet.id === project.activeSheetId ? " active" : "");
      button.textContent = sheet.name;
      button.addEventListener("click", function () {
        project.activeSheetId = sheet.id;
        editor.selection = null;
        editor.pendingTerminal = null;
        renderInspector(null);
        App.saveProject(project);
        refresh();
      });
      button.addEventListener("dblclick", function () {
        var name = window.prompt("Nazwa arkusza:", sheet.name);
        if (name && name.trim()) { sheet.name = name.trim(); projectChanged("Zmieniono nazwę arkusza."); }
      });
      elements.tabs.appendChild(button);
    });
  }

  function setMode(nextMode) {
    mode = nextMode;
    if (mode === "edit") lastSimulation = emptySimulation;
    editor.setMode(mode);
    elements.editMode.classList.toggle("active", mode === "edit");
    elements.simulateMode.classList.toggle("active", mode === "simulate");
    elements.modeStatus.classList.toggle("simulating", mode === "simulate");
    elements.modeStatus.textContent = mode === "simulate" ? "Symulacja uruchomiona" : "Tryb projektowania";
    notify(mode === "simulate" ? "Symulacja została uruchomiona." : "Możesz edytować schemat.");
    refresh();
  }

  /** Ustawia stan przycisku po akcji na schemacie lub pulpicie. */
  function activateButton(component, phase) {
    if (component.buttonType === "stable") {
      if (phase === "down") component.state = !component.state;
    } else {
      component.state = phase === "down";
      if (phase === "down" && !releasingButtons.has(component.id)) {
        releasingButtons.add(component.id);
        window.addEventListener("pointerup", function releaseMomentary() {
          releasingButtons.delete(component.id);
          component.state = false;
          App.saveProject(project);
          refresh();
        }, { once: true });
      }
    }
    App.saveProject(project);
    refresh();
  }

  function renderControlPanel() {
    elements.panelControls.replaceChildren();
    var buttons = [];
    project.sheets.forEach(function (sheet) {
      sheet.components.filter(function (component) { return component.type === "button"; }).forEach(function (component) {
        buttons.push({ sheet: sheet, component: component });
      });
    });
    if (!buttons.length) {
      var empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "Dodaj przycisk do dowolnego arkusza.";
      elements.panelControls.appendChild(empty);
      return;
    }
    buttons.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "panel-control";
      var label = document.createElement("span");
      label.textContent = item.component.label + " · " + item.sheet.name;
      var button = document.createElement("button");
      button.type = "button";
      button.className = item.component.state ? "on" : "";
      button.textContent = item.component.state ? "WŁ." : (item.component.buttonType === "momentary" ? "NACIŚNIJ" : "WYŁ.");
      if (item.component.buttonType === "stable") {
        button.addEventListener("click", function () { activateButton(item.component, "down"); });
      } else {
        button.addEventListener("pointerdown", function () { activateButton(item.component, "down"); });
      }
      row.appendChild(label);
      row.appendChild(button);
      elements.panelControls.appendChild(row);
    });
  }

  function renderInspector(selection) {
    var component = selection && selection.kind === "component" ? editor.selectedComponent() : null;
    var wireSelected = selection && selection.kind === "wire";
    elements.emptySelection.hidden = Boolean(component || wireSelected);
    elements.propertyForm.hidden = !(component || wireSelected);
    elements.relayField.hidden = !component || ["coil", "contactNO", "contactNC"].indexOf(component.type) === -1;
    elements.tagField.hidden = !component || component.type !== "connector";
    elements.buttonField.hidden = !component || component.type !== "button";
    elements.burnedField.hidden = !component || component.type !== "lamp";
    if (!component) {
      elements.label.parentElement.hidden = true;
      return;
    }
    elements.label.parentElement.hidden = false;
    elements.label.value = component.label || "";
    elements.relay.value = component.relay || "";
    elements.tag.value = component.tag || "";
    elements.buttonType.value = component.buttonType || "momentary";
    elements.burned.checked = Boolean(component.burned);
  }

  function updateSelected(property, value, message) {
    var component = editor.selectedComponent();
    if (!component) return;
    component[property] = value;
    projectChanged(message);
  }

  elements.label.addEventListener("input", function () { updateSelected("label", elements.label.value, "Zmieniono nazwę elementu."); });
  elements.relay.addEventListener("input", function () { updateSelected("relay", elements.relay.value.trim(), "Zmieniono powiązanie przekaźnika."); });
  elements.tag.addEventListener("input", function () { updateSelected("tag", elements.tag.value.trim(), "Zmieniono łącznik arkuszy."); });
  elements.buttonType.addEventListener("change", function () { updateSelected("buttonType", elements.buttonType.value, "Zmieniono typ przycisku."); });
  elements.burned.addEventListener("change", function () { updateSelected("burned", elements.burned.checked, "Zmieniono stan żarówki."); });

  elements.editMode.addEventListener("click", function () { setMode("edit"); });
  elements.simulateMode.addEventListener("click", function () { setMode("simulate"); });
  document.getElementById("delete-selection").addEventListener("click", function () { editor.deleteSelection(); });
  document.addEventListener("keydown", function (event) {
    if ((event.key === "Delete" || event.key === "Backspace") && event.target.tagName !== "INPUT" && event.target.tagName !== "SELECT") editor.deleteSelection();
  });

  document.getElementById("add-sheet").addEventListener("click", function () {
    var sheet = App.createSheet("Arkusz " + (project.sheets.length + 1));
    project.sheets.push(sheet);
    project.activeSheetId = sheet.id;
    editor.selection = null;
    projectChanged("Dodano nowy arkusz.");
  });

  document.getElementById("clear-sheet").addEventListener("click", function () {
    if (!window.confirm("Usunąć wszystkie elementy z aktywnego arkusza?")) return;
    activeSheet().components = [];
    activeSheet().wires = [];
    editor.selection = null;
    projectChanged("Wyczyszczono arkusz.");
  });

  document.getElementById("fit-example").addEventListener("click", function () {
    if (!window.confirm("Wczytać projekt przykładowy i zastąpić bieżący projekt?")) return;
    project = App.createExampleProject();
    editor.selection = null;
    setMode("edit");
    projectChanged("Wczytano projekt przykładowy.");
  });

  document.getElementById("save-project").addEventListener("click", function () { App.saveProject(project); notify("Projekt zapisano lokalnie."); });
  document.getElementById("export-project").addEventListener("click", function () { App.downloadProject(project); notify("Pobrano kopię projektu JSON."); });
  document.getElementById("import-project").addEventListener("change", function (event) {
    var file = event.target.files[0];
    if (!file) return;
    App.readProjectFile(file).then(function (loaded) {
      project = loaded;
      editor.selection = null;
      setMode("edit");
      projectChanged("Zaimportowano projekt.");
    }).catch(function (error) { notify("Błąd importu: " + error.message); });
    event.target.value = "";
  });

  renderPalette();
  renderInspector(null);
  setMode("edit");
}(window.CircuitApp = window.CircuitApp || {}));
