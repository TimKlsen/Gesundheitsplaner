/** Tailwind-Konfiguration – hier legst du fest, welche Dateien nach Klassen durchsucht werden. */
module.exports = {
  // Nur Klassen, die in diesen Dateien vorkommen, landen in css/tailwind.css (hält die Datei klein).
  content: ['./index.html', './js/**/*.js'],
  // Dunkelmodus per Klasse "dark" am <html>-Element (wird vom Umschalter gesetzt)
  darkMode: 'class',
  theme: { extend: {} },
  plugins: [],
};
