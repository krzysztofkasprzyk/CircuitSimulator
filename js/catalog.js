(function (App) {
  "use strict";

  var two = [{ id: "left", x: -42, y: 0 }, { id: "right", x: 42, y: 0 }];

  function item(name, short, family, terminals, defaults, description) {
    return { name: name, short: short, family: family, terminals: terminals, defaults: defaults || {}, description: description || "" };
  }

  /*
   * Biblioteka funkcjonalna. Każda pozycja ma własny symbol i zachowanie;
   * typy historyczne pozostają, aby starsze projekty nadal się otwierały.
   */
  App.catalog = {
    powerPlus: item("Zasilanie +", "+", "Zasilanie", [{ id: "out", x: 42, y: 0 }], {}, "Dodatni biegun źródła, oznaczony strzałką."),
    powerMinus: item("Powrót − / bezpiecznik", "−", "Zasilanie", [{ id: "in", x: -42, y: 0 }], {}, "Powrót obwodu w formie prostokątnego bezpiecznika."),
    connector: item("Łącznik międzyarkuszowy", "X", "Zasilanie", [{ id: "net", x: 0, y: 24 }], { tag: "X" }, "Łączy elektrycznie wszystkie punkty o tej samej literze na dowolnych arkuszach."),
    diode: item("Dioda prostownicza", "D", "Zasilanie", two, {}, "Przewodzi tylko od anody (lewa) do katody (prawa)."),
    transformer: item("Transformator separacyjny", "TR", "Zasilanie", [
      { id: "p1", x: -42, y: -18 }, { id: "p2", x: -42, y: 18 },
      { id: "s1", x: 42, y: -18 }, { id: "s2", x: 42, y: 18 }
    ], {}, "Pierwotne i wtórne uzwojenie są galwanicznie odseparowane; stan zasilenia jest przenoszony na stronę wtórną."),
    transformerLegacy: item("Transformator (zgodność v1)", "TR", "Ukryte", two, {}, "Element zgodności dla dawnych projektów; działał jako przewodnik szeregowy."),

    button: item("Przycisk / przełącznik", "S", "Sterowanie", two, { buttonType: "push" }, "Przycisk wciskany, wyciągany, stabilny albo trójpozycyjny; obsługiwany z pulpitu."),

    contactNO: item("Zestyk czynny zwierny", "NO", "Zestyki", two, { contactRole: "active" }, "Zamyka się po wzbudzeniu cewki o tej samej nazwie."),
    contactNC: item("Zestyk czynny rozwierny", "NC", "Zestyki", two, { contactRole: "active" }, "Otwiera się po wzbudzeniu cewki o tej samej nazwie."),
    contactPassiveNO: item("Zestyk bierny zwierny", "NO·B", "Zestyki", two, { contactRole: "passive" }, "Zestyk zwierny powiązany mechanicznie z przekaźnikiem."),
    contactPassiveNC: item("Zestyk bierny rozwierny", "NC·B", "Zestyki", two, { contactRole: "passive" }, "Zestyk rozwierny powiązany mechanicznie z przekaźnikiem."),

    coil: item("Cewka zwyczajna", "K", "Cewki przekaźników", two, { delayMs: 1000 }, "Steruje zestykami o tej samej nazwie bez zwłoki."),
    coilRemanent: item("Cewka remanencyjna", "K·R", "Cewki przekaźników", two, { delayMs: 1000 }, "Po impulsie zachowuje stan do ręcznego wyzerowania pamięci symulacji."),
    coilOnDelay: item("Cewka opóźniona na wzbudzanie", "K·TON", "Cewki przekaźników", two, { delayMs: 1000 }, "Wzbudza zestyki po ustawionym czasie ciągłego zasilania."),
    coilOffDelay: item("Cewka opóźniona na odwzbudzanie", "K·TOF", "Cewki przekaźników", two, { delayMs: 1000 }, "Podtrzymuje zestyki przez ustawiony czas po zaniku zasilania."),
    coilPulse: item("Cewka przekaźnika impulsowego", "K·IMP", "Cewki przekaźników", two, { delayMs: 1000 }, "Każde narastające zbocze zasilania przełącza zapamiętany stan."),

    auxCoil: item("Cewka pomocnicza zwyczajna", "KA", "Cewki pomocnicze", two, { delayMs: 1000 }, "Pomocniczy element wykonawczy bez zwłoki."),
    auxCoilOffDelay: item("Cewka pomocnicza opóźniona na odpadanie", "KA·TOF", "Cewki pomocnicze", two, { delayMs: 1000 }, "Pomocniczy element wykonawczy z opóźnionym odpadaniem."),

    lightCoil: item("Cewka kontroli światła", "UKS", "Kontrola światła", two, { delayMs: 1000 }, "Kontroluje lampę o tej samej nazwie."),
    lightCoilBridge: item("Cewka kontroli światła z mostkiem", "UKS·~", "Kontrola światła", two, { delayMs: 1000 }, "Kontrola światła z oznaczeniem mostka prostowniczego."),
    lightCoilOffDelay: item("Cewka kontroli światła opóźniona", "UKS·TOF", "Kontrola światła", two, { delayMs: 1000 }, "Kontrola światła z opóźnionym odpadaniem."),
    lamp: item("Żarówka / LED", "H", "Sygnalizacja", two, { lampKind: "lamp" }, "Świeci, gdy obwód przewodzi i opcjonalna cewka kontroli światła jest aktywna.")
  };

  App.paletteGroups = ["Zasilanie", "Sterowanie", "Zestyki", "Cewki przekaźników", "Cewki pomocnicze", "Kontrola światła", "Sygnalizacja"];
  App.paletteOrder = Object.keys(App.catalog).filter(function (type) { return App.catalog[type].family !== "Ukryte"; });

  App.isContactType = function (type) {
    return ["contactNO", "contactNC", "contactPassiveNO", "contactPassiveNC"].indexOf(type) !== -1;
  };
  App.isNormallyClosed = function (type) {
    return ["contactNC", "contactPassiveNC"].indexOf(type) !== -1;
  };
  App.isCoilType = function (type) {
    return ["coil", "coilRemanent", "coilOnDelay", "coilOffDelay", "coilPulse", "auxCoil", "auxCoilOffDelay", "lightCoil", "lightCoilBridge", "lightCoilOffDelay"].indexOf(type) !== -1;
  };
  App.isLightControlType = function (type) {
    return ["lightCoil", "lightCoilBridge", "lightCoilOffDelay"].indexOf(type) !== -1;
  };
  App.terminalsFor = function (component) {
    if (component.type === "button" && component.buttonType === "threePosition") {
      return [{ id: "left", x: -42, y: 0 }, { id: "right", x: 42, y: -14 }, { id: "alt", x: 42, y: 14 }];
    }
    return App.catalog[component.type].terminals;
  };
}(window.CircuitApp = window.CircuitApp || {}));
