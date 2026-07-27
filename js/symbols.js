(function (App) {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  App.svgElement = function (name, attributes) {
    var element = document.createElementNS(SVG_NS, name);
    Object.keys(attributes || {}).forEach(function (key) { element.setAttribute(key, attributes[key]); });
    return element;
  };

  App.terminalPosition = function (component, terminalId) {
    var terminal = App.terminalsFor(component).find(function (item) { return item.id === terminalId; });
    return { x: component.x + terminal.x, y: component.y + terminal.y };
  };

  function line(x1, y1, x2, y2, className) {
    return App.svgElement("line", { x1: x1, y1: y1, x2: x2, y2: y2, "class": className || "symbol-line" });
  }
  function circle(cx, cy, r, className) {
    return App.svgElement("circle", { cx: cx, cy: cy, r: r, "class": className || "symbol-fill" });
  }
  function text(group, value, x, y, className) {
    var node = App.svgElement("text", { x: x, y: y, "class": className || "symbol-text" });
    node.textContent = value;
    group.appendChild(node);
  }

  function appendContact(group, closed, passive) {
    group.appendChild(line(-42, 0, -20, 0));
    group.appendChild(line(20, 0, 42, 0));
    group.appendChild(circle(-20, 0, 3, "terminal-mark"));
    group.appendChild(circle(20, 0, 3, "terminal-mark"));
    var arm = line(-20, 0, 20, closed ? 0 : -14, "symbol-line contact-arm");
    var animation = App.svgElement("animate", { attributeName: "y2", from: closed ? -14 : 0, to: closed ? 0 : -14, dur: "160ms", fill: "freeze" });
    arm.appendChild(animation); group.appendChild(arm);
    if (passive) group.appendChild(App.svgElement("path", { d: "M -7 9 L 0 14 L 7 9", "class": "qualifier" }));
  }

  function appendCoil(group, component) {
    group.appendChild(line(-42, 0, -21, 0));
    group.appendChild(App.svgElement("rect", { x: -21, y: -17, width: 42, height: 34, rx: 1, "class": "symbol-fill" }));
    group.appendChild(line(21, 0, 42, 0));
    text(group, component.relay || "K", 0, 5, "symbol-text coil-id");
    var type = component.type;
    if (type === "coilRemanent") text(group, "R", 27, -19, "qualifier-text");
    if (type === "coilOnDelay") group.appendChild(App.svgElement("path", { d: "M -18 -23 H 18 M -18 -28 V -18", "class": "qualifier" }));
    if (["coilOffDelay", "auxCoilOffDelay", "lightCoilOffDelay"].indexOf(type) !== -1) group.appendChild(App.svgElement("path", { d: "M -18 -23 H 18 M 18 -28 V -18", "class": "qualifier" }));
    if (type === "coilPulse") text(group, "I", 27, -19, "qualifier-text");
    if (type === "auxCoil" || type === "auxCoilOffDelay") text(group, "A", -28, -19, "qualifier-text");
    if (App.isLightControlType(type)) text(group, "L", -28, -19, "qualifier-text");
    if (type === "lightCoilBridge") {
      group.appendChild(App.svgElement("path", { d: "M 25 -25 l 6 6 l -6 6 l -6 -6 Z", "class": "qualifier" }));
      group.appendChild(line(19, -19, 31, -19, "qualifier"));
    }
  }

  App.drawSymbol = function (group, component, simulation) {
    var relayActive = Boolean(simulation && simulation.relays && simulation.relays[component.relay]);
    var type = component.type;

    if (type === "powerPlus") {
      group.appendChild(line(-24, 0, 42, 0));
      group.appendChild(App.svgElement("path", { d: "M 6 -9 L 24 0 L 6 9 Z", "class": "symbol-fill solid" }));
    } else if (type === "powerMinus") {
      group.appendChild(line(-42, 0, -18, 0));
      group.appendChild(App.svgElement("rect", { x: -18, y: -8, width: 36, height: 16, "class": "symbol-fill" }));
      group.appendChild(line(18, 0, 33, 0));
    } else if (type === "button") {
      if (component.buttonType === "threePosition") {
        group.appendChild(line(-42, 0, -20, 0)); group.appendChild(circle(-20, 0, 3, "terminal-mark"));
        group.appendChild(line(20, -14, 42, -14)); group.appendChild(line(20, 14, 42, 14));
        group.appendChild(circle(20, -14, 3, "terminal-mark")); group.appendChild(circle(20, 14, 3, "terminal-mark"));
        var selectorY = Number(component.state) < 0 ? -14 : Number(component.state) > 0 ? 14 : 0;
        group.appendChild(line(-20, 0, Number(component.state) ? 20 : 8, selectorY, "symbol-line contact-arm"));
        group.appendChild(line(0, -8, 0, -28)); group.appendChild(App.svgElement("path", { d: "M -16 -29 H 16 M 0 -34 V -24", "class": "symbol-line" }));
      } else {
        appendContact(group, Boolean(component.state), false);
        group.appendChild(line(0, -14, 0, -28));
        if (component.buttonType === "pull") group.appendChild(App.svgElement("path", { d: "M -10 -26 L 0 -35 L 10 -26", "class": "symbol-line" }));
        else group.appendChild(App.svgElement("rect", { x: -12, y: -34, width: 24, height: 7, rx: 2, "class": "symbol-fill" }));
      }
    } else if (App.isContactType(type)) {
      appendContact(group, App.isNormallyClosed(type) ? !relayActive : relayActive, type.indexOf("Passive") !== -1);
    } else if (App.isCoilType(type)) {
      appendCoil(group, component);
    } else if (type === "lamp") {
      group.appendChild(line(-42, 0, -20, 0));
      group.appendChild(circle(0, 0, 20));
      if (component.lampKind === "led") {
        group.appendChild(App.svgElement("path", { d: "M -11 -10 L 11 0 L -11 10 Z M 11 -11 V 11", "class": "symbol-line" }));
        group.appendChild(App.svgElement("path", { d: "M 8 -19 l 9 -7 M 14 -15 l 9 -7", "class": "symbol-line thin" }));
      } else {
        group.appendChild(line(-13, -13, 13, 13));
        group.appendChild(line(-13, 13, 13, -13));
      }
      group.appendChild(line(20, 0, 42, 0));
    } else if (type === "diode") {
      group.appendChild(line(-42, 0, -18, 0));
      group.appendChild(App.svgElement("path", { d: "M -18 -14 L 14 0 L -18 14 Z", "class": "symbol-fill" }));
      group.appendChild(line(14, -15, 14, 15));
      group.appendChild(line(14, 0, 42, 0));
      text(group, "A", -25, -7, "terminal-caption");
      text(group, "K", 25, -7, "terminal-caption");
    } else if (type === "transformerLegacy") {
      group.appendChild(line(-42, 0, -22, 0));
      [-16, -8, 0, 8].forEach(function (x) { group.appendChild(App.svgElement("path", { d: "M " + x + " -15 C " + (x + 9) + " -8 " + (x + 9) + " 8 " + x + " 15", "class": "symbol-line" })); });
      group.appendChild(line(22, 0, 42, 0));
    } else if (type === "transformer") {
      group.appendChild(line(-42, -18, -23, -18)); group.appendChild(line(-42, 18, -23, 18));
      group.appendChild(line(23, -18, 42, -18)); group.appendChild(line(23, 18, 42, 18));
      [-17, -9, -1].forEach(function (y) { group.appendChild(App.svgElement("path", { d: "M -23 " + y + " C -11 " + y + " -11 " + (y + 8) + " -23 " + (y + 8), "class": "symbol-line" })); });
      [-17, -9, -1].forEach(function (y) { group.appendChild(App.svgElement("path", { d: "M 23 " + y + " C 11 " + y + " 11 " + (y + 8) + " 23 " + (y + 8), "class": "symbol-line" })); });
      group.appendChild(line(-4, -24, -4, 24, "symbol-line thin")); group.appendChild(line(4, -24, 4, 24, "symbol-line thin"));
    } else if (type === "connector") {
      group.appendChild(circle(0, 0, 19));
      group.appendChild(line(0, 19, 0, 24));
      text(group, component.tag || "?", 0, 5, "symbol-text connector-id");
    }
  };

  App.paletteIcon = function (type) {
    var sample = Object.assign({ type: type, relay: "K", tag: "X", state: false }, App.catalog[type].defaults || {});
    var svg = App.svgElement("svg", { viewBox: "-54 -39 108 78", "aria-hidden": "true" });
    App.drawSymbol(svg, sample, { relays: {} });
    return svg;
  };
}(window.CircuitApp = window.CircuitApp || {}));
