(function (App) {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  App.svgElement = function svgElement(name, attributes) {
    var element = document.createElementNS(SVG_NS, name);
    Object.keys(attributes || {}).forEach(function (key) { element.setAttribute(key, attributes[key]); });
    return element;
  };

  /** Zwraca współrzędne zacisku w układzie arkusza. */
  App.terminalPosition = function terminalPosition(component, terminalId) {
    var terminal = App.catalog[component.type].terminals.find(function (item) { return item.id === terminalId; });
    return { x: component.x + terminal.x, y: component.y + terminal.y };
  };

  function line(x1, y1, x2, y2, className) {
    return App.svgElement("line", { x1: x1, y1: y1, x2: x2, y2: y2, "class": className || "symbol-line" });
  }

  function circle(cx, cy, r, className) {
    return App.svgElement("circle", { cx: cx, cy: cy, r: r, "class": className || "symbol-fill" });
  }

  function appendContact(group, closed) {
    group.appendChild(line(-42, 0, -20, 0));
    group.appendChild(line(20, 0, 42, 0));
    group.appendChild(circle(-20, 0, 3, "symbol-fill"));
    group.appendChild(circle(20, 0, 3, "symbol-fill"));
    group.appendChild(line(-20, 0, 20, closed ? 0 : -13, "symbol-line contact-arm"));
  }

  /** Rysuje właściwy symbol elektryczny wewnątrz grupy SVG. */
  App.drawSymbol = function drawSymbol(group, component, simulation) {
    var relayActive = Boolean(simulation && simulation.relays[component.relay]);
    var type = component.type;

    if (type === "powerPlus") {
      group.appendChild(line(-22, 0, 42, 0));
      group.appendChild(App.svgElement("path", { d: "M 9 -9 L 24 0 L 9 9 Z", "class": "symbol-fill" }));
    } else if (type === "powerMinus") {
      group.appendChild(line(-42, 0, -17, 0));
      group.appendChild(App.svgElement("rect", { x: -17, y: -8, width: 34, height: 16, "class": "symbol-fill" }));
      group.appendChild(line(17, 0, 31, 0));
    } else if (type === "button") {
      appendContact(group, Boolean(component.state));
      group.appendChild(line(0, -13, 0, -27));
      group.appendChild(App.svgElement("rect", { x: -11, y: -32, width: 22, height: 7, rx: 2, "class": "symbol-fill" }));
    } else if (type === "contactNO") {
      appendContact(group, relayActive);
    } else if (type === "contactNC") {
      appendContact(group, !relayActive);
    } else if (type === "coil") {
      group.appendChild(line(-42, 0, -19, 0));
      group.appendChild(circle(0, 0, 19));
      group.appendChild(line(19, 0, 42, 0));
      var coilText = App.svgElement("text", { x: 0, y: 4, "class": "component-label" });
      coilText.textContent = component.relay || "K";
      group.appendChild(coilText);
    } else if (type === "lamp") {
      group.appendChild(line(-42, 0, -19, 0));
      group.appendChild(circle(0, 0, 19));
      group.appendChild(line(-12, -12, 12, 12));
      group.appendChild(line(-12, 12, 12, -12));
      group.appendChild(line(19, 0, 42, 0));
    } else if (type === "diode") {
      group.appendChild(line(-42, 0, -18, 0));
      group.appendChild(App.svgElement("path", { d: "M -18 -14 L 14 0 L -18 14 Z", "class": "symbol-fill" }));
      group.appendChild(line(14, -15, 14, 15));
      group.appendChild(line(14, 0, 42, 0));
    } else if (type === "transformer") {
      group.appendChild(line(-42, 0, -21, 0));
      [-15, -7, 7, 15].forEach(function (x) {
        group.appendChild(App.svgElement("path", { d: "M " + x + " -15 C " + (x + 8) + " -8 " + (x + 8) + " 8 " + x + " 15", "class": "symbol-line" }));
      });
      group.appendChild(line(21, 0, 42, 0));
    } else if (type === "connector") {
      group.appendChild(circle(0, 0, 18));
      group.appendChild(line(0, 18, 0, 22));
      var tag = App.svgElement("text", { x: 0, y: 5, "class": "component-label" });
      tag.textContent = component.tag || "?";
      group.appendChild(tag);
    }
  };

  /** Miniatura symbolu używana w bibliotece elementów. */
  App.paletteIcon = function paletteIcon(type) {
    var sample = { type: type, relay: "K", tag: "X", state: false };
    var svg = App.svgElement("svg", { viewBox: "-52 -26 104 52", "aria-hidden": "true" });
    App.drawSymbol(svg, sample, { relays: {} });
    return svg;
  };
}(window.CircuitApp = window.CircuitApp || {}));
