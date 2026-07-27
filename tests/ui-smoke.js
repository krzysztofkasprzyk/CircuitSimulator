const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" });
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 }, deviceScaleFactor: 1 });
  const problems = [];
  page.on("pageerror", error => problems.push(error.message));
  page.on("console", message => { if (message.type() === "error") problems.push(message.text()); });

  await page.goto(pathToFileURL(path.join(__dirname, "..", "index.html")).href);
  await page.waitForSelector(".palette-button");
  const title = await page.title();
  if (!title.includes("RelayLab")) throw new Error("Nieprawidłowy tytuł aplikacji.");
  if (await page.locator(".palette-button").count() < 20) throw new Error("Biblioteka nie pokazuje pełnego zestawu elementów.");

  await page.fill("#palette-search", "remanencyjna");
  if (await page.locator(".palette-button").count() !== 1) throw new Error("Wyszukiwanie biblioteki nie filtruje elementów.");
  await page.click(".palette-button");
  if (await page.locator("#property-form").isHidden()) throw new Error("Właściwości dodanego elementu nie są widoczne.");
  if (!(await page.locator("#tag-field").isHidden()) || !(await page.locator("#button-field").isHidden())) throw new Error("Panel właściwości pokazuje pola niepasujące do cewki.");
  await page.fill("#palette-search", "");
  await page.click("#simulate-mode");
  if (!(await page.locator("#mode-status").getAttribute("class")).includes("simulating")) throw new Error("Tryb symulacji nie został uruchomiony.");

  await page.screenshot({ path: path.join(__dirname, "..", "relaylab-preview.png"), fullPage: true });
  await browser.close();
  if (problems.length) throw new Error("Błędy interfejsu: " + problems.join(" | "));
  console.log("OK: interfejs uruchamia się, filtruje bibliotekę, dodaje element i przechodzi do symulacji.");
})().catch(error => { console.error(error); process.exit(1); });
