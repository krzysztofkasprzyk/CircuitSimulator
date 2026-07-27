(function (App) {
  "use strict";

  function terminalKey(sheetId, componentId, terminalId) {
    return sheetId + ":" + componentId + ":" + terminalId;
  }

  function addNode(graph, key) {
    if (!graph.forward.has(key)) graph.forward.set(key, new Set());
    if (!graph.reverse.has(key)) graph.reverse.set(key, new Set());
  }

  function addArc(graph, from, to) {
    addNode(graph, from);
    addNode(graph, to);
    graph.forward.get(from).add(to);
    graph.reverse.get(to).add(from);
  }

  function addBidirectional(graph, a, b) {
    addArc(graph, a, b);
    addArc(graph, b, a);
  }

  function componentTerminals(sheet, component) {
    var definition = App.catalog[component.type];
    return definition.terminals.map(function (terminal) {
      return terminalKey(sheet.id, component.id, terminal.id);
    });
  }

  function isConducting(component, relays) {
    if (component.type === "button") return Boolean(component.state);
    if (component.type === "contactNO") return Boolean(relays[component.relay]);
    if (component.type === "contactNC") return !Boolean(relays[component.relay]);
    if (component.type === "lamp") return !component.burned;
    return ["coil", "diode", "transformer"].indexOf(component.type) !== -1;
  }

  /** Buduje skierowany graf przewodzenia dla aktualnych stanów przekaźników. */
  function buildGraph(project, relays) {
    var graph = { forward: new Map(), reverse: new Map(), sources: [], sinks: [], componentEdges: new Map(), wireEdges: new Map() };
    var connectorGroups = new Map();

    project.sheets.forEach(function (sheet) {
      var componentsById = new Map(sheet.components.map(function (component) { return [component.id, component]; }));

      sheet.components.forEach(function (component) {
        var terminals = componentTerminals(sheet, component);
        terminals.forEach(function (key) { addNode(graph, key); });
        if (component.type === "powerPlus") graph.sources.push(terminals[0]);
        if (component.type === "powerMinus") graph.sinks.push(terminals[0]);
        if (component.type === "connector" && component.tag) {
          if (!connectorGroups.has(component.tag)) connectorGroups.set(component.tag, []);
          connectorGroups.get(component.tag).push(terminals[0]);
        }
        if (terminals.length === 2 && isConducting(component, relays)) {
          if (component.type === "diode") addArc(graph, terminals[0], terminals[1]);
          else addBidirectional(graph, terminals[0], terminals[1]);
          graph.componentEdges.set(component.id, terminals);
        }
      });

      sheet.wires.forEach(function (wire) {
        if (!componentsById.has(wire.from.componentId) || !componentsById.has(wire.to.componentId)) return;
        var a = terminalKey(sheet.id, wire.from.componentId, wire.from.terminalId);
        var b = terminalKey(sheet.id, wire.to.componentId, wire.to.terminalId);
        addBidirectional(graph, a, b);
        graph.wireEdges.set(wire.id, [a, b]);
      });
    });

    connectorGroups.forEach(function (keys) {
      for (var i = 1; i < keys.length; i += 1) addBidirectional(graph, keys[0], keys[i]);
    });
    return graph;
  }

  function traverse(starts, adjacency) {
    var visited = new Set(starts);
    var queue = starts.slice();
    while (queue.length) {
      var current = queue.shift();
      (adjacency.get(current) || []).forEach(function (next) {
        if (!visited.has(next)) { visited.add(next); queue.push(next); }
      });
    }
    return visited;
  }

  function liveNodes(graph) {
    var fromPlus = traverse(graph.sources, graph.forward);
    var toMinus = traverse(graph.sinks, graph.reverse);
    return new Set(Array.from(fromPlus).filter(function (key) { return toMinus.has(key); }));
  }

  function edgeIsLive(edge, nodes) {
    return edge && edge.every(function (key) { return nodes.has(key); });
  }

  function relayStatesFromCoils(project, graph, nodes) {
    var relays = {};
    project.sheets.forEach(function (sheet) {
      sheet.components.forEach(function (component) {
        if (component.type === "coil" && component.relay) {
          relays[component.relay] = Boolean(relays[component.relay] || edgeIsLive(graph.componentEdges.get(component.id), nodes));
        }
      });
    });
    return relays;
  }

  function sameRelayState(a, b) {
    var keys = new Set(Object.keys(a).concat(Object.keys(b)));
    return Array.from(keys).every(function (key) { return Boolean(a[key]) === Boolean(b[key]); });
  }

  /**
   * Przelicza projekt do stanu stabilnego. Kolejne iteracje są potrzebne,
   * ponieważ wzbudzona cewka zmienia zestyki i może utworzyć nową drogę prądu.
   */
  App.simulate = function simulate(project, initialRelays) {
    var relays = Object.assign({}, initialRelays || {});
    var graph;
    var nodes;
    var stable = false;
    var iteration;

    for (iteration = 0; iteration < 24; iteration += 1) {
      graph = buildGraph(project, relays);
      nodes = liveNodes(graph);
      var nextRelays = relayStatesFromCoils(project, graph, nodes);
      if (sameRelayState(relays, nextRelays)) { relays = nextRelays; stable = true; break; }
      relays = nextRelays;
    }

    graph = buildGraph(project, relays);
    nodes = liveNodes(graph);
    var poweredComponents = new Set();
    var poweredWires = new Set();

    project.sheets.forEach(function (sheet) {
      sheet.components.forEach(function (component) {
        var terminals = componentTerminals(sheet, component);
        if (component.type === "powerPlus" || component.type === "powerMinus" || component.type === "connector") {
          if (terminals.some(function (key) { return nodes.has(key); })) poweredComponents.add(component.id);
        } else if (edgeIsLive(graph.componentEdges.get(component.id), nodes)) {
          poweredComponents.add(component.id);
        }
      });
      sheet.wires.forEach(function (wire) {
        if (edgeIsLive(graph.wireEdges.get(wire.id), nodes)) poweredWires.add(wire.id);
      });
    });

    return { relays: relays, poweredComponents: poweredComponents, poweredWires: poweredWires, stable: stable, iterations: iteration + 1 };
  };

  App.terminalKey = terminalKey;
}(window.CircuitApp = window.CircuitApp || {}));
