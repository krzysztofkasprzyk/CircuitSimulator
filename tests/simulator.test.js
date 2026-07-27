/* Minimalne testy silnika, uruchamiane bez przeglądarki poleceniem Node.js. */
global.window = global;
require("../js/catalog.js");
require("../js/model.js");
require("../js/simulator.js");

var App = global.CircuitApp;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

var project = App.createExampleProject();
var initial = App.simulate(project);
assert(!initial.relays.K1, "K1 nie może być wzbudzony przed naciśnięciem START.");

var start = project.sheets[0].components.find(function (component) { return component.type === "button"; });
var lamp = project.sheets[1].components.find(function (component) { return component.type === "lamp"; });
start.state = true;
var pressed = App.simulate(project, initial.relays);
assert(pressed.relays.K1, "K1 powinien wzbudzić się po naciśnięciu START.");
assert(pressed.poweredComponents.has(lamp.id), "Lampa powinna świecić po wzbudzeniu K1.");

start.state = false;
var held = App.simulate(project, pressed.relays);
assert(held.relays.K1, "Zestyk K1 powinien podtrzymać cewkę po puszczeniu START.");

lamp.burned = true;
var burned = App.simulate(project, held.relays);
assert(!burned.poweredComponents.has(lamp.id), "Przepalona lampa nie może przewodzić.");

console.log("OK: testy symulatora zakończone powodzeniem.");

var fs = require("fs");
var path = require("path");
var demoPath = path.join(__dirname, "..", "przykladowy-uklad-blokady.json");
var demo = App.normalizeProject(JSON.parse(fs.readFileSync(demoPath, "utf8")));
var mainSwitch = demo.sheets[0].components.find(function (component) { return component.id === "ctrl-main-switch"; });
var permitSwitch = demo.sheets[0].components.find(function (component) { return component.id === "ctrl-permit-switch"; });
var redLamp = demo.sheets[2].components.find(function (component) { return component.id === "sig-red-lamp"; });
var greenLamp = demo.sheets[2].components.find(function (component) { return component.id === "sig-green-lamp"; });
var powerLamp = demo.sheets[2].components.find(function (component) { return component.id === "sig-power-lamp"; });

var demoInitial = App.simulate(demo);
assert(demoInitial.poweredComponents.has(redLamp.id), "Czerwone światło powinno świecić w stanie początkowym.");
assert(!demoInitial.poweredComponents.has(greenLamp.id), "Zielone światło nie może świecić w stanie początkowym.");

mainSwitch.state = true;
var demoPowered = App.simulate(demo, demoInitial.relays);
assert(demoPowered.relays.K1, "Zasilanie główne powinno wzbudzić K1.");
assert(demoPowered.poweredComponents.has(powerLamp.id), "Kontrolka ZASILANIE OK powinna świecić po wzbudzeniu K1.");

permitSwitch.state = true;
var demoPermitted = App.simulate(demo, demoPowered.relays);
assert(demoPermitted.relays.K2, "Zezwolenie powinno wzbudzić K2.");
assert(demoPermitted.poweredComponents.has(greenLamp.id), "Zielone światło powinno świecić po wzbudzeniu K2.");
assert(!demoPermitted.poweredComponents.has(redLamp.id), "Czerwone światło powinno zgasnąć po wzbudzeniu K2.");

console.log("OK: demonstracyjny układ blokady działa we wszystkich etapach.");

function blankProject(name) {
  var sheet = App.createSheet(name);
  return { version: 2, name: name, sheets: [sheet], activeSheetId: sheet.id };
}
function add(sheet, type, props) {
  var component = App.createComponent(type, 100, 100, props || {});
  sheet.components.push(component);
  return component;
}
function wire(sheet, a, at, b, bt) { sheet.wires.push(App.createWire(a.id, at, b.id, bt)); }

/* TON: zwłoka jest liczona od ciągłego pojawienia się zasilania. */
var timedProject = blankProject("TON");
var timedSheet = timedProject.sheets[0];
var tPlus = add(timedSheet, "powerPlus");
var tButton = add(timedSheet, "button", { state: true });
var tCoil = add(timedSheet, "coilOnDelay", { relay: "KT1", delayMs: 500 });
var tMinus = add(timedSheet, "powerMinus");
wire(timedSheet, tPlus, "out", tButton, "left"); wire(timedSheet, tButton, "right", tCoil, "left"); wire(timedSheet, tCoil, "right", tMinus, "in");
var beforeDelay = App.simulate(timedProject, null, 1000);
assert(!beforeDelay.relays.KT1, "TON nie może zadziałać przed upływem zwłoki.");
var afterDelay = App.simulate(timedProject, beforeDelay, 1501);
assert(afterDelay.relays.KT1, "TON powinien zadziałać po upływie zwłoki.");

/* Przekaźnik impulsowy przełącza się tylko na zboczu narastającym. */
var pulseProject = blankProject("Impuls");
var pulseSheet = pulseProject.sheets[0];
var pPlus = add(pulseSheet, "powerPlus"); var pButton = add(pulseSheet, "button", { state: false });
var pCoil = add(pulseSheet, "coilPulse", { relay: "KI1" }); var pMinus = add(pulseSheet, "powerMinus");
wire(pulseSheet, pPlus, "out", pButton, "left"); wire(pulseSheet, pButton, "right", pCoil, "left"); wire(pulseSheet, pCoil, "right", pMinus, "in");
var pulse0 = App.simulate(pulseProject, null, 1000); pButton.state = true;
var pulse1 = App.simulate(pulseProject, pulse0, 1100); assert(pulse1.relays.KI1, "Pierwszy impuls powinien załączyć przekaźnik impulsowy.");
pButton.state = false; var pulseReleased = App.simulate(pulseProject, pulse1, 1200); pButton.state = true;
var pulse2 = App.simulate(pulseProject, pulseReleased, 1300); assert(!pulse2.relays.KI1, "Drugi impuls powinien wyłączyć przekaźnik impulsowy.");

/* Transformator: pierwotne i wtórne nie są zwarte, lecz aktywne pierwotne zasila wtórne. */
var transformerProject = blankProject("Transformator");
var transformerSheet = transformerProject.sheets[0];
var trPlus = add(transformerSheet, "powerPlus"); var tr = add(transformerSheet, "transformer"); var trMinus = add(transformerSheet, "powerMinus");
var trLamp = add(transformerSheet, "lamp");
wire(transformerSheet, trPlus, "out", tr, "p1"); wire(transformerSheet, tr, "p2", trMinus, "in");
wire(transformerSheet, tr, "s1", trLamp, "left"); wire(transformerSheet, trLamp, "right", tr, "s2");
var transformed = App.simulate(transformerProject, null, 1000);
assert(transformed.activeTransformers.has(tr.id), "Zasilone uzwojenie pierwotne powinno aktywować transformator.");
assert(transformed.poweredComponents.has(trLamp.id), "Obwód wtórny transformatora powinien zasilić lampę.");

console.log("OK: czas, pamięć impulsowa i separowany transformator działają prawidłowo.");

/* Przełącznik trójpozycyjny wybiera dwa niezależne tory. */
var selectorProject = blankProject("Selektor"); var selectorSheet = selectorProject.sheets[0];
var sPlus = add(selectorSheet, "powerPlus"); var selector = add(selectorSheet, "button", { buttonType: "threePosition", state: -1 });
var upperLamp = add(selectorSheet, "lamp"); var lowerLamp = add(selectorSheet, "lamp");
var upperMinus = add(selectorSheet, "powerMinus"); var lowerMinus = add(selectorSheet, "powerMinus");
wire(selectorSheet, sPlus, "out", selector, "left"); wire(selectorSheet, selector, "right", upperLamp, "left"); wire(selectorSheet, upperLamp, "right", upperMinus, "in");
wire(selectorSheet, selector, "alt", lowerLamp, "left"); wire(selectorSheet, lowerLamp, "right", lowerMinus, "in");
var selectedUpper = App.simulate(selectorProject);
assert(selectedUpper.poweredComponents.has(upperLamp.id) && !selectedUpper.poweredComponents.has(lowerLamp.id), "Pozycja − musi zasilać wyłącznie pierwszy tor.");
selector.state = 1; var selectedLower = App.simulate(selectorProject, selectedUpper);
assert(!selectedLower.poweredComponents.has(upperLamp.id) && selectedLower.poweredComponents.has(lowerLamp.id), "Pozycja + musi zasilać wyłącznie drugi tor.");
selector.state = 0; var selectedNeutral = App.simulate(selectorProject, selectedLower);
assert(!selectedNeutral.poweredComponents.has(upperLamp.id) && !selectedNeutral.poweredComponents.has(lowerLamp.id), "Pozycja 0 musi rozłączać oba tory.");
console.log("OK: przełącznik trójpozycyjny wybiera dwa niezależne tory i pozycję neutralną.");
