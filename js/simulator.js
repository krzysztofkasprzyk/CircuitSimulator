(function (App) {
  "use strict";

  function terminalKey(sheetId, componentId, terminalId) { return sheetId + ":" + componentId + ":" + terminalId; }
  function addNode(graph, key) {
    if (!graph.forward.has(key)) graph.forward.set(key, new Set());
    if (!graph.reverse.has(key)) graph.reverse.set(key, new Set());
  }
  function addArc(graph, from, to) {
    addNode(graph, from); addNode(graph, to);
    graph.forward.get(from).add(to); graph.reverse.get(to).add(from);
  }
  function addBidirectional(graph, a, b) { addArc(graph, a, b); addArc(graph, b, a); }
  function keysFor(sheet, component) {
    return App.terminalsFor(component).map(function (t) { return terminalKey(sheet.id, component.id, t.id); });
  }

  function buttonConducts(component) {
    if (component.buttonType === "threePosition") return Number(component.state) !== 0;
    return Boolean(component.state);
  }

  function isConducting(component, relays) {
    if (component.type === "button") return buttonConducts(component);
    if (App.isContactType(component.type)) return App.isNormallyClosed(component.type) ? !Boolean(relays[component.relay]) : Boolean(relays[component.relay]);
    if (component.type === "lamp") {
      var controlled = component.relay ? Boolean(relays[component.relay]) : true;
      return !component.burned && controlled;
    }
    return component.type === "diode" || component.type === "transformerLegacy" || App.isCoilType(component.type);
  }

  function buildGraph(project, relays, activeTransformers) {
    var graph = { forward: new Map(), reverse: new Map(), sources: [], sinks: [], componentEdges: new Map(), wireEdges: new Map(), transformerSides: new Map() };
    var connectorGroups = new Map();
    project.sheets.forEach(function (sheet) {
      var byId = new Map(sheet.components.map(function (c) { return [c.id, c]; }));
      sheet.components.forEach(function (component) {
        var terminals = keysFor(sheet, component);
        terminals.forEach(function (key) { addNode(graph, key); });
        if (component.type === "powerPlus") graph.sources.push(terminals[0]);
        if (component.type === "powerMinus") graph.sinks.push(terminals[0]);
        if (component.type === "connector" && component.tag) {
          if (!connectorGroups.has(component.tag)) connectorGroups.set(component.tag, []);
          connectorGroups.get(component.tag).push(terminals[0]);
        }
        if (component.type === "transformer") {
          graph.transformerSides.set(component.id, { primary: [terminals[0], terminals[1]], secondary: [terminals[2], terminals[3]] });
          addBidirectional(graph, terminals[0], terminals[1]);
          if (activeTransformers.has(component.id)) { graph.sources.push(terminals[2]); graph.sinks.push(terminals[3]); }
        } else if (component.type === "button" && component.buttonType === "threePosition" && Number(component.state) !== 0) {
          var selectedOutput = Number(component.state) < 0 ? terminals[1] : terminals[2];
          addBidirectional(graph, terminals[0], selectedOutput); graph.componentEdges.set(component.id, [terminals[0], selectedOutput]);
        } else if (terminals.length === 2 && isConducting(component, relays)) {
          if (component.type === "diode") addArc(graph, terminals[0], terminals[1]);
          else addBidirectional(graph, terminals[0], terminals[1]);
          graph.componentEdges.set(component.id, terminals);
        }
      });
      sheet.wires.forEach(function (wire) {
        if (!byId.has(wire.from.componentId) || !byId.has(wire.to.componentId)) return;
        var a = terminalKey(sheet.id, wire.from.componentId, wire.from.terminalId);
        var b = terminalKey(sheet.id, wire.to.componentId, wire.to.terminalId);
        addBidirectional(graph, a, b); graph.wireEdges.set(wire.id, [a, b]);
      });
    });
    connectorGroups.forEach(function (list) { for (var i = 1; i < list.length; i += 1) addBidirectional(graph, list[0], list[i]); });
    return graph;
  }

  function traverse(starts, adjacency) {
    var visited = new Set(starts), queue = starts.slice();
    while (queue.length) {
      var current = queue.shift();
      (adjacency.get(current) || []).forEach(function (next) { if (!visited.has(next)) { visited.add(next); queue.push(next); } });
    }
    return visited;
  }
  function liveNodes(graph) {
    var fromSource = traverse(graph.sources, graph.forward);
    var toSink = traverse(graph.sinks, graph.reverse);
    return new Set(Array.from(fromSource).filter(function (key) { return toSink.has(key); }));
  }
  function edgeIsLive(edge, nodes) { return Boolean(edge && edge.every(function (key) { return nodes.has(key); })); }
  function sameState(a, b) {
    var keys = new Set(Object.keys(a).concat(Object.keys(b)));
    return Array.from(keys).every(function (key) { return Boolean(a[key]) === Boolean(b[key]); });
  }

  function nextCoilState(component, raw, prior, now) {
    var state = Boolean(prior.state), since = prior.since || null, delay = Math.max(0, Number(component.delayMs) || 0);
    if (component.type === "coilRemanent") return { state: state || raw, raw: raw, since: raw ? (since || now) : null };
    if (component.type === "coilPulse") {
      var rising = raw && !prior.raw;
      return { state: rising ? !state : state, raw: raw, since: null };
    }
    if (component.type === "coilOnDelay") {
      since = raw ? (since || now) : null;
      return { state: Boolean(raw && now - since >= delay), raw: raw, since: since };
    }
    if (["coilOffDelay", "auxCoilOffDelay", "lightCoilOffDelay"].indexOf(component.type) !== -1) {
      since = raw ? null : (prior.raw ? now : since);
      state = raw || Boolean(state && since !== null && now - since < delay);
      return { state: state, raw: raw, since: since };
    }
    return { state: raw, raw: raw, since: null };
  }

  function deriveActuators(project, graph, nodes, priorRuntime, now) {
    var relays = {}, runtime = {};
    project.sheets.forEach(function (sheet) {
      sheet.components.forEach(function (component) {
        if (!App.isCoilType(component.type) || !component.relay) return;
        var raw = edgeIsLive(graph.componentEdges.get(component.id), nodes);
        var next = nextCoilState(component, raw, priorRuntime[component.id] || { state: false, raw: false, since: null }, now);
        runtime[component.id] = next;
        relays[component.relay] = Boolean(relays[component.relay] || next.state);
      });
    });
    return { relays: relays, runtime: runtime };
  }

  function activeTransformersFrom(graph, nodes) {
    var active = new Set();
    graph.transformerSides.forEach(function (sides, id) { if (edgeIsLive(sides.primary, nodes)) active.add(id); });
    return active;
  }
  function sameSet(a, b) { return a.size === b.size && Array.from(a).every(function (value) { return b.has(value); }); }

  /* Dyskretny silnik obwodów sterowniczych: przewodzenie, przekaźniki, czas,
     pamięć i galwanicznie odseparowana strona wtórna transformatora. */
  App.simulate = function simulate(project, previous, now) {
    now = Number(now) || Date.now();
    var previousResult = previous && previous.relays ? previous : { relays: previous || {}, runtime: {}, activeTransformers: new Set() };
    var priorRuntime = previousResult.runtime || {};
    var relays = Object.assign({}, previousResult.relays || {});
    var activeTransformers = previousResult.activeTransformers instanceof Set ? new Set(previousResult.activeTransformers) : new Set(previousResult.activeTransformers || []);
    var graph, nodes, derived, nextTransformers, stable = false, iteration = 0;

    for (iteration = 0; iteration < 32; iteration += 1) {
      graph = buildGraph(project, relays, activeTransformers);
      nodes = liveNodes(graph);
      derived = deriveActuators(project, graph, nodes, priorRuntime, now);
      nextTransformers = activeTransformersFrom(graph, nodes);
      if (sameState(relays, derived.relays) && sameSet(activeTransformers, nextTransformers)) { relays = derived.relays; activeTransformers = nextTransformers; stable = true; break; }
      relays = derived.relays; activeTransformers = nextTransformers;
    }

    graph = buildGraph(project, relays, activeTransformers); nodes = liveNodes(graph);
    derived = deriveActuators(project, graph, nodes, priorRuntime, now);
    relays = derived.relays;
    var poweredComponents = new Set(), poweredWires = new Set();
    project.sheets.forEach(function (sheet) {
      sheet.components.forEach(function (component) {
        var terminals = keysFor(sheet, component);
        if (component.type === "transformer") {
          var sides = graph.transformerSides.get(component.id);
          if (activeTransformers.has(component.id) || edgeIsLive(sides && sides.primary, nodes)) poweredComponents.add(component.id);
        } else if (["powerPlus", "powerMinus", "connector"].indexOf(component.type) !== -1) {
          if (terminals.some(function (key) { return nodes.has(key); })) poweredComponents.add(component.id);
        } else if (edgeIsLive(graph.componentEdges.get(component.id), nodes)) poweredComponents.add(component.id);
      });
      sheet.wires.forEach(function (wire) { if (edgeIsLive(graph.wireEdges.get(wire.id), nodes)) poweredWires.add(wire.id); });
    });
    return { relays: relays, runtime: derived.runtime, activeTransformers: activeTransformers, poweredComponents: poweredComponents, poweredWires: poweredWires, stable: stable, iterations: iteration + 1, now: now };
  };

  App.terminalKey = terminalKey;
}(window.CircuitApp = window.CircuitApp || {}));
