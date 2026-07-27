(function (App) {
  "use strict";

  var STORAGE_KEY = "relaylab-project-v2";
  var LEGACY_STORAGE_KEY = "relay-circuit-prototype-v1";

  /** Zapisuje projekt w pamięci lokalnej przeglądarki. */
  App.saveProject = function saveProject(project) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  };

  /** Wczytuje ostatni zapis; zwraca null, jeśli zapis nie istnieje. */
  App.loadProject = function loadProject() {
    var data = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    return data ? App.normalizeProject(JSON.parse(data)) : null;
  };

  /** Pobiera projekt jako plik JSON, który można przekazać innej osobie. */
  App.downloadProject = function downloadProject(project) {
    var blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    var anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "projekt-obwodu.json";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  /** Odczytuje projekt JSON wybrany w polu plikowym. */
  App.readProjectFile = function readProjectFile(file) {
    return file.text().then(function (text) { return App.normalizeProject(JSON.parse(text)); });
  };
}(window.CircuitApp = window.CircuitApp || {}));
