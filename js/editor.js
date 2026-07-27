(function (App) {
  "use strict";

  /**
   * Kontroler edytora SVG. Odpowiada za rysowanie arkusza, przeciąganie
   * elementów, tworzenie przewodów i zaznaczanie obiektów.
   */
  function CircuitEditor(options) {
    this.svg = options.svg;
    this.wireLayer = options.wireLayer;
    this.componentLayer = options.componentLayer;
    this.getProject = options.getProject;
    this.onChange = options.onChange;
    this.onSelectionChange = options.onSelectionChange;
    this.onComponentAction = options.onComponentAction;
    this.mode = "edit";
    this.selection = null;
    this.pendingTerminal = null;
    this.simulation = { relays: {}, poweredComponents: new Set(), poweredWires: new Set(), stable: true };
    this.drag = null;

    var self = this;
    this.svg.addEventListener("pointerdown", function (event) {
      if (event.target === self.svg || event.target.classList.contains("grid-background")) self.select(null);
    });
  }

  CircuitEditor.prototype.activeSheet = function activeSheet() {
    var project = this.getProject();
    return project.sheets.find(function (sheet) { return sheet.id === project.activeSheetId; });
  };

  CircuitEditor.prototype.setMode = function setMode(mode) {
    this.mode = mode;
    this.pendingTerminal = null;
    this.svg.classList.toggle("simulation", mode === "simulate");
    this.render();
  };

  CircuitEditor.prototype.setSimulation = function setSimulation(simulation) {
    this.simulation = simulation;
    this.render();
  };

  CircuitEditor.prototype.select = function select(selection) {
    this.selection = selection;
    this.onSelectionChange(selection);
    this.render();
  };

  CircuitEditor.prototype.addComponent = function addComponent(type) {
    var sheet = this.activeSheet();
    var spot = null;
    for (var y = 100; y <= 660 && !spot; y += 100) {
      for (var x = 120; x <= 1280; x += 160) {
        var occupied = sheet.components.some(function (item) { return Math.abs(item.x - x) < 120 && Math.abs(item.y - y) < 75; });
        if (!occupied) { spot = { x: x, y: y }; break; }
      }
    }
    spot = spot || { x: 700, y: 380 };
    var component = App.createComponent(type, spot.x, spot.y);
    sheet.components.push(component);
    this.select({ kind: "component", id: component.id });
    this.onChange("Dodano: " + App.catalog[type].name);
  };

  CircuitEditor.prototype.deleteSelection = function deleteSelection() {
    var sheet = this.activeSheet();
    if (!this.selection) return;
    if (this.selection.kind === "wire") {
      sheet.wires = sheet.wires.filter(function (wire) { return wire.id !== this.selection.id; }, this);
    } else {
      var id = this.selection.id;
      sheet.components = sheet.components.filter(function (component) { return component.id !== id; });
      sheet.wires = sheet.wires.filter(function (wire) { return wire.from.componentId !== id && wire.to.componentId !== id; });
    }
    this.selection = null;
    this.onSelectionChange(null);
    this.onChange("Usunięto zaznaczenie.");
    this.render();
  };

  CircuitEditor.prototype.selectedComponent = function selectedComponent() {
    if (!this.selection || this.selection.kind !== "component") return null;
    return this.activeSheet().components.find(function (component) { return component.id === this.selection.id; }, this);
  };

  CircuitEditor.prototype.svgPoint = function svgPoint(event) {
    var point = this.svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(this.svg.getScreenCTM().inverse());
  };

  CircuitEditor.prototype.startDrag = function startDrag(event, component) {
    if (this.mode !== "edit" || event.target.classList.contains("terminal")) return;
    event.preventDefault();
    var start = this.svgPoint(event);
    this.drag = { component: component, dx: start.x - component.x, dy: start.y - component.y };
    this.select({ kind: "component", id: component.id });

    var self = this;
    function move(moveEvent) {
      if (!self.drag) return;
      var point = self.svgPoint(moveEvent);
      component.x = Math.max(60, Math.min(1340, Math.round((point.x - self.drag.dx) / 20) * 20));
      component.y = Math.max(60, Math.min(700, Math.round((point.y - self.drag.dy) / 20) * 20));
      self.render();
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (self.drag) self.onChange("Przesunięto element.");
      self.drag = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  CircuitEditor.prototype.handleTerminal = function handleTerminal(event, component, terminalId) {
    event.stopPropagation();
    if (this.mode !== "edit") return;
    var current = { componentId: component.id, terminalId: terminalId };
    if (!this.pendingTerminal) {
      this.pendingTerminal = current;
      this.render();
      return;
    }
    if (this.pendingTerminal.componentId !== current.componentId || this.pendingTerminal.terminalId !== current.terminalId) {
      this.activeSheet().wires.push(App.createWire(
        this.pendingTerminal.componentId, this.pendingTerminal.terminalId,
        current.componentId, current.terminalId
      ));
      this.onChange("Połączono zaciski.");
    }
    this.pendingTerminal = null;
    this.render();
  };

  CircuitEditor.prototype.renderWire = function renderWire(wire, components) {
    var from = components.get(wire.from.componentId);
    var to = components.get(wire.to.componentId);
    if (!from || !to) return;
    var a = App.terminalPosition(from, wire.from.terminalId);
    var b = App.terminalPosition(to, wire.to.terminalId);
    var mid = Math.round(((a.x + b.x) / 2) / 20) * 20;
    var d = "M " + a.x + " " + a.y + " H " + mid + " V " + b.y + " H " + b.x;
    var selected = this.selection && this.selection.kind === "wire" && this.selection.id === wire.id;
    var powered = this.simulation.poweredWires.has(wire.id);
    var visible = App.svgElement("path", { d: d, "class": "wire" + (powered ? " powered" : "") + (selected ? " selected" : "") });
    var hit = App.svgElement("path", { d: d, "class": "wire-hit" });
    var self = this;
    hit.addEventListener("pointerdown", function (event) { event.stopPropagation(); self.select({ kind: "wire", id: wire.id }); });
    this.wireLayer.appendChild(visible);
    this.wireLayer.appendChild(hit);
  };

  CircuitEditor.prototype.renderComponent = function renderComponent(component) {
    var powered = this.simulation.poweredComponents.has(component.id);
    var selected = this.selection && this.selection.kind === "component" && this.selection.id === component.id;
    var group = App.svgElement("g", {
      transform: "translate(" + component.x + " " + component.y + ")",
      "class": "component" + (powered ? " powered" : "") + (selected ? " selected" : "") + (component.burned ? " burned" : ""),
      "data-component-id": component.id
    });
    group.appendChild(App.svgElement("rect", { x: -55, y: -46, width: 110, height: 92, rx: 5, "class": "selection-box" }));
    App.drawSymbol(group, component, this.simulation);

    var label = App.svgElement("text", { x: 0, y: component.type === "connector" ? 53 : 34, "class": "component-label" });
    label.textContent = component.label;
    group.appendChild(label);
    if ((App.isContactType(component.type) || App.isCoilType(component.type) || (component.type === "lamp" && component.relay)) && component.relay) {
      var relayTag = App.svgElement("text", { x: 0, y: -31, "class": "relay-tag" });
      relayTag.textContent = component.relay;
      group.appendChild(relayTag);
    }

    var self = this;
    App.terminalsFor(component).forEach(function (terminal) {
      var pending = self.pendingTerminal && self.pendingTerminal.componentId === component.id && self.pendingTerminal.terminalId === terminal.id;
      var node = App.svgElement("circle", { cx: terminal.x, cy: terminal.y, r: 5, "class": "terminal" + (pending ? " pending" : "") });
      node.addEventListener("pointerdown", function (event) { self.handleTerminal(event, component, terminal.id); });
      group.appendChild(node);
    });

    group.addEventListener("pointerdown", function (event) {
      if (self.mode === "simulate" && component.type === "button") self.onComponentAction(component, "down");
      else self.startDrag(event, component);
    });
    if (component.type === "button") {
      group.addEventListener("pointerup", function () { if (self.mode === "simulate") self.onComponentAction(component, "up"); });
      group.addEventListener("pointerleave", function () { if (self.mode === "simulate") self.onComponentAction(component, "up"); });
    }
    group.addEventListener("click", function (event) { event.stopPropagation(); if (self.mode === "edit") self.select({ kind: "component", id: component.id }); });
    this.componentLayer.appendChild(group);
  };

  /* Łącznik mechaniczny jest tworzony automatycznie dla pionowego szeregu
     zestyków tego samego przekaźnika. Wszystkie zestyki i tak mają wspólny stan. */
  CircuitEditor.prototype.renderMechanicalLinks = function renderMechanicalLinks(sheet) {
    var groups = new Map();
    sheet.components.filter(function (component) { return App.isContactType(component.type) && component.relay; }).forEach(function (component) {
      var lane = Math.round(component.x / 40);
      var key = component.relay + ":" + lane;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(component);
    });
    groups.forEach(function (contacts) {
      if (contacts.length < 2) return;
      contacts.sort(function (a, b) { return a.y - b.y; });
      for (var i = 1; i < contacts.length; i += 1) {
        var a = contacts[i - 1], b = contacts[i];
        var link = App.svgElement("line", { x1: a.x, y1: a.y + 18, x2: b.x, y2: b.y - 18, "class": "mechanical-link" });
        this.componentLayer.insertBefore(link, this.componentLayer.firstChild);
      }
      for (var j = 1; j < contacts.length; j += 1) {
        var node = this.componentLayer.querySelector('[data-component-id="' + contacts[j].id + '"] .relay-tag');
        if (node) node.remove();
      }
    }, this);
  };

  CircuitEditor.prototype.render = function render() {
    this.wireLayer.replaceChildren();
    this.componentLayer.replaceChildren();
    var sheet = this.activeSheet();
    if (!sheet) return;
    var components = new Map(sheet.components.map(function (component) { return [component.id, component]; }));
    sheet.wires.forEach(function (wire) { this.renderWire(wire, components); }, this);
    sheet.components.forEach(function (component) { this.renderComponent(component); }, this);
    this.renderMechanicalLinks(sheet);
  };

  App.CircuitEditor = CircuitEditor;
}(window.CircuitApp = window.CircuitApp || {}));
