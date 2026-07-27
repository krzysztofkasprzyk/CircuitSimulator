(function (App) {
  "use strict";

  /**
   * Katalog elementów dostępnych w prototypie. Opis zacisków jest używany
   * jednocześnie przez edytor, renderer SVG oraz silnik symulacji.
   */
  App.catalog = {
    powerPlus: { name: "Zasilanie +", short: "+", terminals: [{ id: "out", x: 42, y: 0 }] },
    powerMinus: { name: "Powrót −", short: "−", terminals: [{ id: "in", x: -42, y: 0 }] },
    button: { name: "Przycisk", short: "P", terminals: [{ id: "left", x: -42, y: 0 }, { id: "right", x: 42, y: 0 }] },
    contactNO: { name: "Zestyk zwierny", short: "NO", terminals: [{ id: "left", x: -42, y: 0 }, { id: "right", x: 42, y: 0 }] },
    contactNC: { name: "Zestyk rozwierny", short: "NC", terminals: [{ id: "left", x: -42, y: 0 }, { id: "right", x: 42, y: 0 }] },
    coil: { name: "Cewka", short: "K", terminals: [{ id: "left", x: -42, y: 0 }, { id: "right", x: 42, y: 0 }] },
    lamp: { name: "Żarówka / LED", short: "L", terminals: [{ id: "left", x: -42, y: 0 }, { id: "right", x: 42, y: 0 }] },
    diode: { name: "Dioda prostownicza", short: "D", terminals: [{ id: "left", x: -42, y: 0 }, { id: "right", x: 42, y: 0 }] },
    transformer: { name: "Transformator", short: "TR", terminals: [{ id: "left", x: -42, y: 0 }, { id: "right", x: 42, y: 0 }] },
    connector: { name: "Łącznik arkuszy", short: "X", terminals: [{ id: "net", x: 0, y: 22 }] }
  };

  App.paletteOrder = [
    "powerPlus", "powerMinus", "button", "contactNO", "contactNC",
    "coil", "lamp", "diode", "transformer", "connector"
  ];
}(window.CircuitApp = window.CircuitApp || {}));
