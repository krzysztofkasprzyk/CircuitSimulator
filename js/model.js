(function (App) {
  "use strict";

  var nextId = 1;

  /** Zwraca unikalny identyfikator obiektu projektu. */
  App.uid = function uid(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + (nextId++).toString(36);
  };

  /** Tworzy pusty arkusz schematu. */
  App.createSheet = function createSheet(name) {
    return { id: App.uid("sheet"), name: name || "Arkusz", components: [], wires: [] };
  };

  /** Tworzy komponent z bezpiecznymi wartościami domyślnymi. */
  App.createComponent = function createComponent(type, x, y, overrides) {
    var defaults = {
      id: App.uid("component"), type: type, x: x, y: y,
      label: App.catalog[type].short, relay: type === "coil" ? "K1" : "",
      tag: type === "connector" ? "X" : "", buttonType: "momentary",
      state: false, burned: false
    };
    return Object.assign(defaults, overrides || {});
  };

  /** Tworzy połączenie pomiędzy dwoma zaciskami. */
  App.createWire = function createWire(fromComponent, fromTerminal, toComponent, toTerminal) {
    return {
      id: App.uid("wire"),
      from: { componentId: fromComponent, terminalId: fromTerminal },
      to: { componentId: toComponent, terminalId: toTerminal }
    };
  };

  function add(sheet, type, x, y, props) {
    var component = App.createComponent(type, x, y, props);
    sheet.components.push(component);
    return component;
  }

  function connect(sheet, a, aTerminal, b, bTerminal) {
    sheet.wires.push(App.createWire(a.id, aTerminal, b.id, bTerminal));
  }

  /**
   * Buduje projekt demonstracyjny na dwóch arkuszach. Pokazuje przenoszenie
   * zasilania przez łącznik X oraz sterowanie zestykiem nazwą cewki K1.
   */
  App.createExampleProject = function createExampleProject() {
    var control = App.createSheet("Sterowanie");
    var lights = App.createSheet("Sygnalizacja");

    var plus1 = add(control, "powerPlus", 110, 180, { label: "+24 V" });
    var start = add(control, "button", 300, 180, { label: "START", buttonType: "momentary" });
    var linkOut = add(control, "connector", 480, 180, { label: "do ark. 2", tag: "X" });
    connect(control, plus1, "out", start, "left");
    connect(control, start, "right", linkOut, "net");

    var plusHold = add(control, "powerPlus", 110, 340, { label: "+24 V" });
    var hold = add(control, "contactNO", 300, 340, { label: "podtrzymanie", relay: "K1" });
    var linkHold = add(control, "connector", 480, 340, { label: "X", tag: "X" });
    connect(control, plusHold, "out", hold, "left");
    connect(control, hold, "right", linkHold, "net");

    var linkIn = add(lights, "connector", 130, 180, { label: "z ark. 1", tag: "X" });
    var coil = add(lights, "coil", 340, 180, { label: "cewka K1", relay: "K1" });
    var minus1 = add(lights, "powerMinus", 550, 180, { label: "0 V" });
    connect(lights, linkIn, "net", coil, "left");
    connect(lights, coil, "right", minus1, "in");

    var plus2 = add(lights, "powerPlus", 130, 360, { label: "+24 V" });
    var contact = add(lights, "contactNO", 340, 360, { label: "zestyk K1", relay: "K1" });
    var lamp = add(lights, "lamp", 540, 360, { label: "L1" });
    var minus2 = add(lights, "powerMinus", 730, 360, { label: "0 V" });
    connect(lights, plus2, "out", contact, "left");
    connect(lights, contact, "right", lamp, "left");
    connect(lights, lamp, "right", minus2, "in");

    return {
      version: 1,
      name: "Prototyp obwodu przekaźnikowego",
      sheets: [control, lights],
      activeSheetId: control.id
    };
  };

  /** Normalizuje projekt po imporcie ze starszego lub niepełnego pliku. */
  App.normalizeProject = function normalizeProject(project) {
    if (!project || !Array.isArray(project.sheets) || !project.sheets.length) {
      throw new Error("Plik nie zawiera prawidłowego projektu.");
    }
    project.version = 1;
    project.sheets.forEach(function (sheet) {
      sheet.components = Array.isArray(sheet.components) ? sheet.components : [];
      sheet.wires = Array.isArray(sheet.wires) ? sheet.wires : [];
      sheet.components.forEach(function (component) {
        component.state = Boolean(component.state);
        component.burned = Boolean(component.burned);
        component.label = component.label || App.catalog[component.type].short;
        component.relay = component.relay || "";
        component.tag = component.tag || "";
        component.buttonType = component.buttonType || "momentary";
      });
    });
    project.activeSheetId = project.sheets.some(function (sheet) { return sheet.id === project.activeSheetId; })
      ? project.activeSheetId : project.sheets[0].id;
    return project;
  };
}(window.CircuitApp = window.CircuitApp || {}));
