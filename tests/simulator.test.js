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
