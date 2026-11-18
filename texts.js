/* Deutungstexte (Schweizer Schreibweise, ss statt ß) */
window.TEXTS = {
  signTrait: {
    Widder: 'direkt, mutig und schnell entschlossen', Stier: 'beständig, sinnlich und auf Sicherheit bedacht',
    Zwillinge: 'neugierig, wendig und gesprächig', Krebs: 'fürsorglich, gefühlvoll und heimatverbunden',
    'Löwe': 'herzlich, grosszügig und gern im Mittelpunkt', Jungfrau: 'genau, hilfsbereit und praktisch',
    Waage: 'ausgleichend, charmant und beziehungsorientiert', Skorpion: 'intensiv, tiefgründig und willensstark',
    'Schütze': 'optimistisch, freiheitsliebend und sinnsuchend', Steinbock: 'ehrgeizig, verantwortungsvoll und ausdauernd',
    Wassermann: 'eigenständig, originell und zukunftsorientiert', Fische: 'einfühlsam, fantasievoll und durchlässig'
  },
  pointRole: {
    Sun: 'Dein Wesenskern', Moon: 'Deine Gefühlswelt', ASC: 'Deine Ausstrahlung', Mercury: 'Dein Denken', Venus: 'Deine Art zu lieben',
    Mars: 'Dein Antrieb', Jupiter: 'Dein Glücksprinzip', Saturn: 'Deine Prüfsteine', MC: 'Dein Lebensziel'
  },
  natalArea: {
    Sun: 'deine Vitalität und dein Selbstvertrauen', Moon: 'dein Gefühlsleben und dein Zuhause', Mercury: 'dein Denken und deine Gespräche',
    Venus: 'Liebe, Genuss und deine Finanzen', Mars: 'deine Tatkraft und deinen Durchsetzungswillen', Jupiter: 'deine Zuversicht und Wachstumschancen',
    Saturn: 'Pflichten und langfristige Strukturen', Uranus: 'deinen Wunsch nach Freiheit und Veränderung', Neptune: 'Intuition und Träume',
    Pluto: 'tiefe Wandlungsprozesse', ASC: 'dein Auftreten und deinen Körper', MC: 'Beruf, Ruf und Lebensrichtung'
  },
  transit: {
    Sun: { harm: 'bringt Rückenwind und gute Sichtbarkeit für', tense: 'setzt einen Spannungspunkt auf', conj: 'rückt ins Rampenlicht:' },
    Moon: { harm: 'sorgt für eine angenehme Stimmung rund um', tense: 'macht empfindlich in Bezug auf', conj: 'färbt emotional ein:' },
    Mercury: { harm: 'erleichtert Gespräche, Pläne und Verhandlungen über', tense: 'kann zu Missverständnissen führen rund um', conj: 'lenkt deine Gedanken auf' },
    Venus: { harm: 'schenkt Harmonie, Charme und Genuss für', tense: 'bringt Wünsche und kleine Unstimmigkeiten rund um', conj: 'verschönert und belebt' },
    Mars: { harm: 'gibt Energie und Mut für', tense: 'erhöht den Druck und die Reizbarkeit rund um', conj: 'entfacht Tatendrang und Ungeduld in Bezug auf' },
    Jupiter: { harm: 'öffnet Türen und vergrössert die Chancen für', tense: 'verleitet zu Übertreibung in Bezug auf', conj: 'erweitert und segnet' },
    Saturn: { harm: 'stabilisiert und belohnt Ausdauer bei', tense: 'prüft und bremst', conj: 'verlangt Ernsthaftigkeit und Verantwortung für' },
    Uranus: { harm: 'bringt überraschende Freiheiten für', tense: 'erschüttert Gewohnheiten rund um', conj: 'krempelt um:' },
    Neptune: { harm: 'stärkt Intuition und Mitgefühl für', tense: 'vernebelt den klaren Blick auf', conj: 'löst Grenzen auf rund um' },
    Pluto: { harm: 'verleiht Tiefe und Durchsetzungskraft für', tense: 'zwingt zur Wandlung in Bezug auf', conj: 'transformiert grundlegend' }
  },
  advice: {
    pos: ['Nutze diesen Impuls aktiv.', 'Ein guter Moment, um Pläne anzustossen.', 'Hier darfst du mutig zugreifen.', 'Sag Ja zu Einladungen.'],
    neg: ['Plane Pufferzeit ein und reagiere nicht vorschnell.', 'Geduld zahlt sich hier mehr aus als Tempo.', 'Kläre Erwartungen früh, bevor sie zu Konflikten werden.', 'Gönn dir bewusst Pausen.']
  },
  house: ['', 'Selbstbild und Auftreten', 'Geld und Werte', 'Lernen, Kontakte und kurze Reisen', 'Familie und Zuhause', 'Liebe, Kreativität und Freude',
    'Arbeitsalltag und Gesundheit', 'Partnerschaft und Verträge', 'Krisen, Intimität und gemeinsame Finanzen', 'Fernreisen, Studium und Weltanschauung',
    'Karriere und öffentliches Ansehen', 'Freundschaften und Netzwerke', 'Rückzug, Spiritualität und Unbewusstes'],
  moonDay: {
    Widder: 'Spontane Energie, gut für Neuanfänge und Sport.', Stier: 'Ruhige, genussvolle Stimmung, gut für Finanzen und Pflege.',
    Zwillinge: 'Lebhafte Gespräche, gut für Kontakte, Termine und Lernen.', Krebs: 'Gefühlvolle Stimmung, gut für Familie und Zuhause.',
    'Löwe': 'Selbstbewusste Stimmung, gut für Auftritte und Kreatives.', Jungfrau: 'Sachliche Stimmung, gut für Ordnung, Gesundheit und Details.',
    Waage: 'Harmonische Stimmung, gut für Beziehungen und Verhandlungen.', Skorpion: 'Intensive Stimmung, gut für tiefe Gespräche und Recherchen.',
    'Schütze': 'Optimistische Stimmung, gut für Reisen und grosse Pläne.', Steinbock: 'Disziplinierte Stimmung, gut für Arbeit und Entscheidungen.',
    Wassermann: 'Offene Stimmung, gut für Teamarbeit und neue Ideen.', Fische: 'Verträumte Stimmung, gut für Erholung, Kunst und Intuition.'
  },
  lifePath: {
    1: ['Pionier', 'Du gehst eigene Wege, willst führen und Neues beginnen.'], 2: ['Vermittler', 'Du lebst durch Zusammenarbeit, Feingefühl und Diplomatie.'],
    3: ['Ausdruck', 'Kreativität, Kommunikation und Lebensfreude sind dein Weg.'], 4: ['Baumeister', 'Du schaffst Stabilität durch Fleiss, Ordnung und Verlässlichkeit.'],
    5: ['Freigeist', 'Du brauchst Abwechslung, Reisen und Erfahrungen aus erster Hand.'], 6: ['Hüter', 'Verantwortung, Familie und Fürsorge prägen deinen Weg.'],
    7: ['Sucher', 'Du suchst Tiefe, Wissen und innere Wahrheit.'], 8: ['Gestalter', 'Erfolg, Einfluss und der kluge Umgang mit Macht und Geld.'],
    9: ['Humanist', 'Mitgefühl, Weitblick und Dienst am Grösseren.'], 11: ['Inspirator (Meisterzahl)', 'Hohe Intuition und Strahlkraft, die andere inspiriert.'],
    22: ['Meisterbaumeister', 'Grosse Visionen praktisch umsetzen.'], 33: ['Meisterlehrer', 'Heilende, lehrende Liebe im Dienst anderer.']
  },
  personalYear: {
    1: 'Jahr des Neubeginns: säen, starten, Initiative zeigen.', 2: 'Jahr der Geduld: Beziehungen pflegen, abwarten, kooperieren.',
    3: 'Jahr des Ausdrucks: kreativ sein, sich zeigen, Kontakte knüpfen.', 4: 'Jahr der Arbeit: Fundamente legen, Ordnung schaffen.',
    5: 'Jahr der Veränderung: Reisen, Wechsel, neue Freiheiten.', 6: 'Jahr der Verantwortung: Familie, Zuhause, Verbindlichkeit.',
    7: 'Jahr der Innenschau: lernen, reflektieren, Gesundheit pflegen.', 8: 'Jahr der Ernte: Karriere, Geld und Anerkennung.',
    9: 'Jahr des Abschlusses: loslassen, aufräumen, Platz schaffen.'
  },
  personalDay: {
    1: 'Starttag: Initiative ergreifen.', 2: 'Kooperationstag: zuhören und verbinden.', 3: 'Ausdruckstag: kommunizieren und kreativ sein.',
    4: 'Arbeitstag: Ordnung und Fleiss.', 5: 'Bewegungstag: Abwechslung und Flexibilität.', 6: 'Herzenstag: Familie und Fürsorge.',
    7: 'Ruhetag: nachdenken und auftanken.', 8: 'Erfolgstag: Geld, Verhandlungen, Entscheidungen.', 9: 'Abschlusstag: erledigen und loslassen.'
  },
  animal: {
    Ratte: 'klug, anpassungsfähig und geschäftstüchtig', 'Büffel': 'zuverlässig, geduldig und stark', Tiger: 'mutig, leidenschaftlich und unabhängig',
    Hase: 'feinfühlig, diplomatisch und kultiviert', Drache: 'charismatisch, ehrgeizig und energiegeladen', Schlange: 'weise, intuitiv und elegant',
    Pferd: 'freiheitsliebend, lebhaft und unternehmungslustig', Ziege: 'sanft, kreativ und harmoniebedürftig', Affe: 'witzig, erfinderisch und vielseitig',
    Hahn: 'genau, ehrlich und selbstbewusst', Hund: 'loyal, gerecht und beschützend', Schwein: 'grosszügig, genussfreudig und gutmütig'
  },
  element: {
    Holz: 'Wachstum, Planung und Grosszügigkeit', Feuer: 'Begeisterung, Ausstrahlung und Tatkraft', Erde: 'Stabilität, Fürsorge und Verlässlichkeit',
    Metall: 'Klarheit, Disziplin und Entschlossenheit', Wasser: 'Weisheit, Anpassung und Intuition'
  },
  elementColor: { Holz: ['Grün', '#3f8f5a'], Feuer: ['Rot', '#c8452f'], Erde: ['Ocker', '#b98a3a'], Metall: ['Weiss und Silber', '#b8bec8'], Wasser: ['Blau und Schwarz', '#2f5d9a'] },
  elementDir: { Holz: 'Osten', Feuer: 'Süden', Erde: 'Mitte (bleib in vertrauter Umgebung)', Metall: 'Westen', Wasser: 'Norden' },
  dayRelation: {
    liuhe: 'Der Tageszweig bildet eine Sechser-Harmonie mit deinem Tierzeichen: Begegnungen und Hilfe von anderen fallen leicht.',
    sanhe: 'Der Tag steht in Dreier-Harmonie zu deinem Tierzeichen: Teamarbeit und gemeinsame Ziele gelingen.',
    chong: 'Der Tag steht im Zusammenstoss mit deinem Tierzeichen: keine grossen Entscheidungen, Konflikte meiden.',
    hai: 'Der Tag bildet einen „Schaden“ zu deinem Tierzeichen: kleine Reibereien sind möglich, bleib diplomatisch.',
    same: 'Der Tag trägt dein eigenes Tierzeichen: du bist gut in deiner Kraft, aber neige nicht zur Sturheit.',
    neutral: 'Der Tag ist für dein Tierzeichen neutral.'
  },
  elementRel: {
    resource: 'Das Element des Tages nährt deinen Tagesmeister: Unterstützung, Lernen und Erholung.',
    peer: 'Das Element des Tages gleicht deinem Tagesmeister: Selbstvertrauen, aber auch Konkurrenz.',
    output: 'Dein Tagesmeister nährt das Element des Tages: gut für kreativen Ausdruck und Präsentationen.',
    wealth: 'Dein Tagesmeister beherrscht das Element des Tages: ein Tag für Geld, Ernte und Ergebnisse.',
    power: 'Das Element des Tages kontrolliert deinen Tagesmeister: Druck von aussen, Disziplin hilft.'
  },
  acgPlanet: {
    Sun: 'Anerkennung, Selbstvertrauen und Sichtbarkeit', Moon: 'Heimatgefühl, Familie und Geborgenheit', Mercury: 'Lernen, Handel und Kommunikation',
    Venus: 'Liebe, Schönheit und Wohlbefinden', Mars: 'Energie, Sport, aber auch Konflikte', Jupiter: 'Glück, Wachstum und Grosszügigkeit',
    Saturn: 'harte Arbeit, Verantwortung und Prüfungen', Uranus: 'Überraschungen, Freiheit und Umbrüche', Neptune: 'Spiritualität, Kunst und Illusionen',
    Pluto: 'Macht, Tiefe und Transformation', Node: 'schicksalhafte Begegnungen'
  },
  acgAngle: {
    MC: 'im Beruf und in der Öffentlichkeit', IC: 'im Privaten, beim Wohnen und in der Familie',
    AC: 'in deiner Persönlichkeit und Ausstrahlung', DC: 'über Partner, Beziehungen und Kooperationen'
  },
  sensitive: {
    Fortuna: ['Wo dir Glück und Wohlbefinden leicht zufallen.', 'Der Glückspunkt verbindet Aszendent, Sonne und Mond. Sein Haus zeigt den Lebensbereich, in dem du dich am natürlichsten wohl fühlst und Erfolg ohne Krampf entsteht.'],
    Spirit: ['Wo du Sinn und geistige Erfüllung findest.', 'Der Geistpunkt ist das Gegenstück zum Glückspunkt. Er zeigt, womit du dich bewusst identifizierst und wo dein Wille und deine Ideen am meisten bewirken.'],
    Love: ['Wie und wo sich Liebe für dich entfaltet.', 'Der Liebespunkt verbindet Venus mit Sonne und Aszendent. Er zeigt, was dich in der Liebe anzieht und in welchem Umfeld Zuneigung entsteht.'],
    Marriage: ['Wo feste Bindungen ihren Anfang nehmen.', 'Der Heiratspunkt beschreibt, unter welchen Umständen aus einer Begegnung eine verbindliche Partnerschaft werden kann.'],
    Success: ['Wo dir Erfolg und Wachstum offenstehen.', 'Der Erfolgspunkt verbindet Jupiter mit Sonne und Aszendent. Er zeigt, in welchem Bereich sich Einsatz besonders lohnt und Türen aufgehen.'],
    Career: ['Wie beruflicher Erfolg zu dir findet.', 'Der Karrierepunkt rechnet vom MC aus. Er zeigt die Art, wie Anerkennung und berufliches Vorankommen für dich entstehen.'],
    SNode: ['Was du mitbringst und loslassen darfst.', 'Der Südknoten steht dem Mondknoten gegenüber. Er zeigt vertraute Fähigkeiten und Gewohnheiten, auf denen du dich nicht ausruhen sollst.'],
    Lilith: ['Deine ungezähmte, eigenwillige Seite.', 'Lilith, der Schwarze Mond, zeigt, wo du dich nicht anpassen willst, wo Leidenschaft und Verweigerung liegen und wo du lernst, zu deiner Eigenart zu stehen.'],
    Vertex: ['Wo schicksalhafte Begegnungen geschehen.', 'Der Vertex gilt als Punkt der Fügung. Wird er durch Transite berührt, treten oft Menschen oder Ereignisse auf, die sich wie vorbestimmt anfühlen.'],
    East: ['Wie du spontan auf andere wirkst.', 'Der Ostpunkt ist eine Art zweiter Aszendent. Er beschreibt, wie du dich zeigst, wenn du nicht nachdenkst, sondern einfach handelst.']
  },
  monthTone: {
    hi: 'Ein starker Monat mit viel Rückenwind.', mid: 'Ein ausgeglichener Monat mit Licht und Schatten.', lo: 'Ein fordernder Monat, in dem Geduld und Planung zählen.'
  }
};
