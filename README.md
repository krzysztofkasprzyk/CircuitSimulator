# Symulator obwodów przekaźnikowych — prototyp

Prototyp działa całkowicie offline i nie wymaga instalacji ani połączenia z internetem.

## Wersja online

Po włączeniu GitHub Pages aplikacja jest dostępna pod adresem:

**https://krzysztofkasprzyk.github.io/CircuitSimulator/**

## Uruchomienie

1. Otwórz folder projektu.
2. Kliknij dwukrotnie `index.html` albo `URUCHOM_PROTOTYP.bat`.
3. Program otworzy się w domyślnej przeglądarce.

Najlepiej używać aktualnej wersji Edge, Chrome lub Firefox.

## Co zawiera prototyp

- biały arkusz z czarnymi elementami i czerwonym oznaczeniem aktywnych obwodów;
- dwa przykładowe arkusze przełączane zakładkami;
- łączniki przenoszące zasilanie między arkuszami przez wspólną literę;
- zasilanie `+`, powrót `−`, przyciski chwilowe i stabilne;
- zestyki zwierne i rozwierne sterowane nazwą cewki;
- cewkę, lampę/LED, diodę, transformator i łącznik arkuszy;
- przeciąganie elementów po siatce i rysowanie przewodów między zaciskami;
- prosty pulpit sterowania generowany z przycisków umieszczonych na schematach;
- symulację przepalonej żarówki;
- lokalny zapis, eksport i import projektu JSON.

## Obsługa

- Dodawanie: wybierz element z lewej biblioteki.
- Przesuwanie: przeciągnij element w trybie projektowania.
- Łączenie: kliknij zacisk jednego elementu, a następnie zacisk drugiego.
- Usuwanie: zaznacz element lub przewód i użyj przycisku „Usuń zaznaczenie” albo klawisza Delete.
- Symulacja: wybierz przycisk „Symulacja” w górnym pasku i używaj pulpitu po prawej stronie.
- Zmiana nazwy arkusza: kliknij dwukrotnie jego zakładkę.

## Struktura kodu

- `js/catalog.js` — katalog elementów i ich zacisków;
- `js/model.js` — model projektu i przykładowy obwód;
- `js/simulator.js` — grafowy silnik propagacji zasilania i przekaźników;
- `js/symbols.js` — symbole SVG;
- `js/editor.js` — edycja arkusza, przewody i przeciąganie;
- `js/storage.js` — zapis lokalny oraz import/eksport;
- `js/app.js` — połączenie interfejsu z edytorem i symulatorem;
- `css/app.css` — wygląd aplikacji.

Kod nie korzysta z zewnętrznych bibliotek, dlatego po skopiowaniu folderu nadal działa offline.

## Praca z repozytorium

Główna gałąź projektu to `main`. Każde wysłanie nowego commita na tę gałąź automatycznie uruchamia publikację GitHub Pages zdefiniowaną w `.github/workflows/pages.yml`.

Typowy cykl dalszej pracy:

```text
git add .
git commit -m "Krótki opis zmiany"
git push
```

Do repozytorium celowo nie trafiają duże pliki z analizy filmu ani lokalne narzędzia FFmpeg.

## Ograniczenia pierwszego prototypu

Pierwsza wersja symuluje dyskretny stan zasilony/niezasilony. Nie oblicza napięcia, natężenia ani parametrów transformatora. Cewki czasowe, remanencyjne i impulsowe oraz rozbudowany edytor pulpitu kolejowego są przewidziane na kolejne etapy.
