# Macierz wymagań klienta — RelayLab v2

| Wymaganie | Realizacja |
|---|---|
| Białe tło, czarne elementy | Biały arkusz SVG; symbole i przewody w czerni. |
| Czerwone podświetlenie zasilenia | Tylko elementy i przewody należące do zamkniętej, aktywnej drogi są czerwone. |
| Osobne arkusze | Zakładki: dodawanie, zmiana nazwy, przełączanie i usuwanie. |
| Przenoszenie prądu między arkuszami | Okrąg z literą; wszystkie łączniki o identycznym oznaczeniu tworzą wspólną sieć globalną. |
| Cztery zestyki | Czynny NO, czynny NC, bierny NO, bierny NC. |
| Cewki przekaźników | Zwyczajna, remanencyjna, TON, TOF i impulsowa. |
| Cewki pomocnicze | Zwyczajna i TOF. |
| Transformator | Cztery zaciski, galwanicznie rozdzielone uzwojenia; zasilenie pierwotnego uruchamia wtórne. |
| Kontrola światła | Cewka zwyczajna, z mostkiem i TOF; lampa z tym samym oznaczeniem wymaga aktywnej cewki kontroli. |
| Żarówka / LED | Dwa symbole wybierane we właściwościach; świecenie i symulacja przepalenia. |
| Dioda prostownicza | Kierunkowe przewodzenie anoda A → katoda K. |
| Zasilanie | `+` jako strzałka; powrót/bezpiecznik jako prostokąt. |
| Przyciski | Wciskany, wyciągany, stabilny oraz 3-pozycyjny z dwoma wyjściami i neutralnym środkiem. |
| Pulpit zmiany stanów | Wszystkie elementy operatorskie z projektu są dostępne w prawym panelu. |
| Pionowa grupa zestyków | Zestyki o tej samej nazwie i w tej samej pionowej osi dostają automatyczną linię przerywaną; opis jest pokazany tylko u góry. |
| Animacja zestyków | Zmiana położenia ramienia trwa 160 ms i uruchamia się po zmianie stanu przekaźnika. |
| Zapis i przenoszenie projektu | Autozapis lokalny, import i eksport JSON, migracja projektów v1. |

## Ustalenia techniczne

- TON oznacza opóźnienie zadziałania po ciągłym zasileniu.
- TOF oznacza podtrzymanie po zaniku zasilania.
- Cewka remanencyjna zachowuje stan po zaniku zasilania do użycia `Reset stanów`.
- Cewka impulsowa przełącza stan na każdym zboczu narastającym.
- Przepalona żarówka jest przerwą w obwodzie.
- Pozycje `−` i `+` przełącznika 3-pozycyjnego zamykają dwa różne tory; `0` rozłącza oba.
- Transformator jest modelem logicznym 1:1: nie oblicza przekładni ani parametrów elektrycznych.

## Granica zastosowania

RelayLab odwzorowuje logikę obwodów sterowniczych. Nie jest programem do obliczeń zwarciowych, ochrony przeciwporażeniowej, doboru przewodów i zabezpieczeń ani analiz SPICE. Przed użyciem do dokumentacji wykonawczej należy uzgodnić z klientem finalny wariant graficzny symboli i zweryfikować go względem posiadanej, licencjonowanej wersji IEC 60617 oraz zasad obowiązujących w konkretnej branży (np. kolejowej lub przemysłowej).
