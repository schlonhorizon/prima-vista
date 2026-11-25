<!--
  Textbausteine für den Modus „Akkordsymbole“.
  "teil.<id>": Bausteine eines Symbols (für den Tipp), "typ.<id>": Beschreibung je Akkordtyp
  (IDs siehe src/theory/chordSymbols.ts).
-->

## tipp
Lies das Symbol von links nach rechts: zuerst der **Grundton**, dann was dazukommt.

{teile}

Ob du die Töne eng oder weit, in Grundstellung oder Umkehrung greifst, ist egal{strikt}.

## tipp.strikt
 – nur der Grundton muss unten liegen

## tipp.bass
 – nur der Ton hinter dem Schrägstrich muss unten liegen

## erklaerung
**{symbol}** – {name}

**Töne:** {toene}

**Formel:** {formel}

{beschreibung}

{quinte}

{bass}

## quinte
Die Quinte (in Klammern) darfst du weglassen – bei None- und Undezim-Akkorden ist das in der Praxis üblich, weil sie wenig zum Klang beiträgt und die Hand entlastet.

## bass.slash
Der Ton hinter dem Schrägstrich ist der **Basston**: Er muss der tiefste Ton sein, der Rest darf in jeder Lage darüber liegen.

## bass.strikt
Im strikten Modus muss der **Grundton** unten liegen; darüber ist jede Lage erlaubt.

## teil.dur
- **nur ein Buchstabe** = Dur-Dreiklang: Grundton, große Terz, Quinte.

## teil.m
- **m** = Moll: die Terz ist klein (♭3).

## teil.sus2
- **sus2** = statt der Terz die große Sekunde (2).

## teil.sus4
- **sus4** = statt der Terz die Quarte (4).

## teil.add9
- **add9** = zum Dreiklang kommt die None (9) dazu – ohne Septime.

## teil.6
- **6** = zum Dreiklang kommt die große Sexte (6).

## teil.7
- **7** allein = kleine Septime (♭7), ein Ganzton unter der Oktave.

## teil.maj7
- **maj7** = große Septime (7), ein Halbton unter der Oktave.

## teil.9
- **9** = None, also die Sekunde eine Oktave höher; bei 9-Akkorden ist auch die Septime dabei.

## teil.11
- **11** = Undezime, die Quarte eine Oktave höher; dazu Septime und None.

## teil.69
- **6/9** = Sexte und None zusätzlich zum Dur-Dreiklang, keine Septime.

## teil.slash
- **/Ton** = Slash-Akkord: der Ton hinter dem Schrägstrich ist der Basston.

## typ.maj
Der Grundbaustein der Harmonik: hell, stabil, „zu Hause“.

## typ.min
Weicher und dunkler als Dur – der Unterschied ist nur die kleine Terz.

## typ.sus2
„Suspended“: Die Terz ist durch die Sekunde ersetzt – offen, schwebend, weder Dur noch Moll. Typisch in Pop-Begleitungen.

## typ.sus4
Die Quarte hält die Terz zurück und will sich oft zur Terz auflösen (Csus4 → C). Klassischer Vorhalt, im Pop auch als eigene Farbe.

## typ.add9
Dur mit glitzernder None, ohne Septime – sehr beliebt in Pop und Songwriting.

## typ.madd9
Moll mit None: weich und etwas melancholisch, oft in Balladen.

## typ.6
Dur mit großer Sexte: freundlich, etwas nostalgisch – Schlussakkord in Swing und Schlager.

## typ.m6
Moll mit großer Sexte: dunkel mit einer Prise Spannung, typisch für Tango, Bossa und Film-Noir-Klänge.

## typ.7
Der Dominantseptakkord: Dur mit kleiner Septime. Terz und Septime bilden einen Tritonus, der zur Auflösung drängt – V7 in jeder Kadenz, Grundakkord im Blues.

## typ.maj7
Dur mit großer Septime: weich, schwebend, „jazzig“ – Tonika im Jazz, Bossa und Neo-Soul.

## typ.m7
Moll mit kleiner Septime: rund und entspannt, die ii in ii–V–I.

## typ.mmaj7
Moll mit großer Septime: spannungsvoll und geheimnisvoll – der „James-Bond-Akkord“, oft als Linie m – m(maj7) – m7.

## typ.9
Dominantseptakkord mit None: voll und funky, im Funk und Blues oft statt des einfachen 7.

## typ.maj9
maj7 mit None: sehr weich und offen, eine typische Jazz- und Neo-Soul-Tonika.

## typ.m9
m7 mit None: warm und modern, Standard-Moll-Akkord im Jazz und R&B.

## typ.mmaj9
m(maj7) mit None: dunkel-schillernd, eher selten, aber sehr charakteristisch.

## typ.69
Dur mit Sexte und None – ohne Septime, daher stabil und zugleich farbig. Klassischer Schlussakkord im Jazz.

## typ.m11
m7 mit None und Undezime: weit und offen, typisch für modalen Jazz (dorisch) und Neo-Soul. Oft als Quartenschichtung gegriffen.

## typ.7sus4
Dominantseptakkord mit Quarte statt Terz: schwebende Dominante, oft vor dem 7 (G7sus4 → G7) oder als eigene Farbe im Gospel und Fusion.

## typ.slash3
Dur-Dreiklang mit der Terz im Bass – klingt wie die 1. Umkehrung und sorgt für schrittweise Basslinien (C – C/E – F).

## typ.slash5
Dur-Dreiklang mit der Quinte im Bass – der Quartsextakkord, oft vor der Dominante oder in absteigenden Bassläufen.

## typ.mslash3
Moll-Dreiklang mit der Terz im Bass – für weiche, schrittweise Basslinien in Moll.
