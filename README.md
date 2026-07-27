# RelayLab — symulator obwodów przekaźnikowych

RelayLab jest działającym offline, przeglądarkowym edytorem i dyskretnym symulatorem obwodów sterowniczych. Interfejs ma biały arkusz, czarne symbole i przewody oraz czerwone oznaczenie wyłącznie aktywnej drogi prądu.

Szczegółowe pokrycie specyfikacji i przyjęte znaczenie funkcji opisuje [macierz wymagań](DOKUMENTACJA_WYMAGAN.md).

## Uruchomienie

Otwórz `index.html` w aktualnym Edge, Chrome albo Firefox. W Windows można też użyć `URUCHOM_RELAYLAB.bat`. Program nie wymaga serwera, instalacji pakietów ani połączenia z internetem.

Instrukcja przekazywana klientowi: [Instrukcja_RelayLab.docx](docs/Instrukcja_RelayLab.docx).

## Zakres funkcjonalny

- dowolna liczba arkuszy w zakładkach, zmiana nazwy dwuklikiem i bezpieczne usuwanie arkusza;
- łącznik międzyarkuszowy: okrąg z literą, globalnie łączący punkty o tym samym oznaczeniu;
- cztery odmiany zestyków: czynny/bierny oraz zwierny/rozwierny;
- cewki zwyczajne, remanencyjne, TON, TOF i impulsowe;
- cewki pomocnicze zwyczajne i TOF;
- cewki kontroli światła: zwyczajna, z mostkiem i TOF;
- transformator z oddzielnym uzwojeniem pierwotnym i wtórnym;
- żarówka lub LED, w tym symulacja przepalenia;
- kierunkowa dioda prostownicza z opisem anody A i katody K;
- zasilanie `+` jako strzałka i powrót/bezpiecznik jako prostokąt;
- przyciski wciskane, wyciągane, stabilne i przełączniki trójpozycyjne z dwoma niezależnymi torami;
- automatyczne przerywane sprzężenie mechaniczne pionowego szeregu zestyków tego samego przekaźnika;
- animowana zmiana położenia zestyków;
- panel operatorski, wyszukiwarka biblioteki i kontekstowy panel właściwości;
- autozapis w przeglądarce oraz import/eksport przenośnego projektu JSON.

## Podstawowa obsługa

1. Wyszukaj element po lewej i kliknij go, aby umieścić w pierwszym wolnym miejscu aktywnego arkusza.
2. Przeciągnij element po siatce. Kliknij dwa zaciski kolejno, aby narysować przewód.
3. Ustaw oznaczenie funkcjonalne, np. `K1`. Cewka oraz zestyki z tym samym oznaczeniem działają wspólnie.
4. Dla lampy wpisanie oznaczenia cewki kontroli światła powoduje, że lampa przewodzi tylko przy aktywnej cewce o tej nazwie.
5. Włącz `Symulację` i steruj przyciskami z prawego pulpitu. `Reset stanów` zeruje elementy operatorskie, przekaźniki remanencyjne i impulsowe.

## Model techniczny

Silnik rozwiązuje graf przewodzenia do stanu stabilnego i obsługuje elementy zależne od czasu. Transformator nie zwiera uzwojeń: zasilone pierwotne uaktywnia odseparowane źródło po stronie wtórnej. Dioda przewodzi wyłącznie A→K. Przepalona lampa tworzy przerwę.

To jest symulator logiki obwodów przekaźnikowych, a nie solver SPICE. Nie wylicza napięć, prądów, mocy, spadków napięcia, impedancji, nagrzewania ani parametrów ochronnych. Nie zastępuje projektu wykonawczego, doboru zabezpieczeń ani weryfikacji bezpieczeństwa przez uprawnionego projektanta.

Nazewnictwo i rodziny symboli są oparte na zakresie oficjalnej bazy [IEC 60617](https://library.iec.ch/iec60617). Szczegółowe symbole normatywne wymagają licencjonowanego dostępu do bazy IEC; implementacja używa własnych, uproszczonych rysunków funkcjonalnych. Układ interfejsu czerpie ze sprawdzonego wzorca edytorów schematów: biblioteka/projekt po lewej, arkusz pośrodku, właściwości po prawej, znanego m.in. z [KiCad Schematic Editor](https://docs.kicad.org/master/en/eeschema/eeschema.html) i narzędzi symulacyjnych.

## Testy

Testy silnika:

```powershell
node tests/simulator.test.js
```

Test dymny interfejsu wymaga Playwright i lokalnej przeglądarki Edge:

```powershell
node tests/ui-smoke.js
```

Testy obejmują m.in. podtrzymanie przekaźnika, blokadę, TON, pamięć impulsową, separowany transformator, dwa tory przełącznika 3-pozycyjnego, filtrowanie biblioteki i przejście do symulacji.

## Struktura

- `js/catalog.js` — biblioteka elementów i zacisków;
- `js/model.js` — model projektu oraz migracja plików v1;
- `js/simulator.js` — graf przewodzenia, czas, pamięć i transformator;
- `js/symbols.js` — rysunki SVG i animacje;
- `js/editor.js` — arkusz, przewody, przeciąganie i sprzężenia mechaniczne;
- `js/app.js` — interfejs, pulpit, właściwości i cykl symulacji;
- `js/storage.js` — autozapis oraz import/eksport;
- `css/app.css` — kompletna szata graficzna.
