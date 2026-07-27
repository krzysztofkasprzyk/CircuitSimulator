const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const output = path.join(root, "docs", "assets");

async function clearMarks(page) {
  await page.evaluate(() => document.querySelectorAll(".manual-mark,.manual-note").forEach(node => node.remove()));
}

async function mark(page, specs, note) {
  await clearMarks(page);
  await page.evaluate(({ specs, note }) => {
    const colors = ["#e3222e", "#1769aa", "#15803d", "#9a5b00"];
    specs.forEach((spec, index) => {
      const nodes = document.querySelectorAll(spec.selector);
      const target = nodes[spec.index || 0];
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const pad = spec.pad ?? 5;
      const box = document.createElement("div");
      box.className = "manual-mark";
      Object.assign(box.style, {
        position: "fixed", zIndex: "10000", pointerEvents: "none",
        left: `${Math.max(2, rect.left - pad)}px`, top: `${Math.max(2, rect.top - pad)}px`,
        width: `${Math.min(innerWidth - rect.left + pad - 2, rect.width + pad * 2)}px`,
        height: `${Math.min(innerHeight - rect.top + pad - 2, rect.height + pad * 2)}px`,
        border: `4px solid ${colors[index % colors.length]}`, borderRadius: "8px",
        boxShadow: "0 2px 12px rgba(0,0,0,.25)"
      });
      const label = document.createElement("div");
      label.textContent = `${index + 1}. ${spec.label}`;
      Object.assign(label.style, {
        position: "absolute", left: "-4px", top: rect.top > 44 ? "-34px" : "4px",
        color: "#fff", background: colors[index % colors.length], padding: "5px 9px",
        font: "700 14px Segoe UI,Arial,sans-serif", borderRadius: "5px", whiteSpace: "nowrap"
      });
      box.appendChild(label); document.body.appendChild(box);
    });
    if (note) {
      const banner = document.createElement("div"); banner.className = "manual-note"; banner.textContent = note;
      Object.assign(banner.style, {
        position: "fixed", zIndex: "10001", pointerEvents: "none", left: "50%", bottom: "14px",
        transform: "translateX(-50%)", maxWidth: "920px", color: "#fff", background: "rgba(24,28,33,.94)",
        padding: "10px 18px", borderRadius: "7px", font: "600 15px Segoe UI,Arial,sans-serif",
        boxShadow: "0 3px 16px rgba(0,0,0,.3)", textAlign: "center"
      });
      document.body.appendChild(banner);
    }
  }, { specs, note });
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" });
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(root, "index.html")).href);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector(".palette-button");

  await mark(page, [
    { selector: ".palette-panel", label: "Biblioteka elementów", pad: 2 },
    { selector: ".sheet-tabs", label: "Zakładki arkuszy", pad: 2 },
    { selector: ".circuit-canvas", label: "Arkusz schematu", pad: 4 },
    { selector: ".inspector-panel", label: "Sterowanie i właściwości", pad: 2 }
  ], "Główny ekran jest podzielony na cztery stałe obszary pracy.");
  await page.screenshot({ path: path.join(output, "01-interfejs.png") });

  await clearMarks(page);
  await page.locator(".component").nth(1).dispatchEvent("click");
  await mark(page, [
    { selector: ".palette-button", index: 5, label: "Kliknij element, aby go dodać", pad: 3 },
    { selector: ".component.selected", label: "Przeciągnij element po siatce", pad: 8 },
    { selector: ".component.selected .terminal", label: "Kliknij pierwszy zacisk", pad: 7 },
    { selector: "#property-form", label: "Ustaw parametry zaznaczenia", pad: 5 }
  ], "Aby połączyć przewód: kliknij zacisk pierwszego elementu, a potem zacisk drugiego.");
  await page.screenshot({ path: path.join(output, "02-edycja.png") });

  await clearMarks(page);
  await page.locator(".tab-button").nth(1).click();
  await page.locator(".component").nth(1).dispatchEvent("click");
  await mark(page, [
    { selector: ".tab-item.active", label: "Aktywny arkusz", pad: 3 },
    { selector: ".component.selected", label: "Wybrana cewka K1", pad: 8 },
    { selector: "#relay-field", label: "Wspólne oznaczenie K1", pad: 4 },
    { selector: "#component-description", label: "Opis działania elementu", pad: 4 }
  ], "Cewka i wszystkie jej zestyki muszą mieć identyczne oznaczenie, np. K1.");
  await page.screenshot({ path: path.join(output, "03-wlasciwosci.png") });

  await clearMarks(page);
  await page.locator(".tab-button").nth(0).click();
  await page.click("#simulate-mode");
  await page.locator("#panel-controls .panel-control button").first().dispatchEvent("pointerdown");
  await page.waitForTimeout(350);
  await mark(page, [
    { selector: "#simulate-mode", label: "Uruchom symulację", pad: 3 },
    { selector: "#panel-controls .panel-control", label: "Steruj przyciskiem START", pad: 5 },
    { selector: ".wire.powered", label: "Czerwony = aktywna droga", pad: 8 }
  ], "W trybie symulacji elementów nie przesuwamy - obsługujemy je z pulpitu po prawej.");
  await page.screenshot({ path: path.join(output, "04-symulacja.png") });
  await page.dispatchEvent("body", "pointerup");

  await browser.close();
  console.log(`Zapisano zrzuty instrukcji w ${output}`);
})().catch(error => { console.error(error); process.exit(1); });
