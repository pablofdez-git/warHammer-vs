// Equipo por defecto de una unidad (columna "loadout" de Datasheets.csv). Viene en HTML:
// <b>Every Nob is equipped with:</b> 1 Kustom Choppa; 1 Kombi-skorcha.<br><br>
// <b>Every Boy is equipped with:</b> 1 Choppa; 1 Shoota; 1 Slugga.

export interface LoadoutSection {
  subject: string; // a quién se refiere: "nob", "boy", "model"…
  items: string[]; // "kustom choppa", "kombi-skorcha"… (sin número, en minúsculas)
}

const SECTION = /<b>([^<]*?)\s+(?:is|are)\s+equipped\s+with:?<\/b>([^<]*)/gi;
// "This model", "Every Boy", "The Captain", "2 Havocs", "One Nightmare Hulk" → "model", "boy"…
const SUBJECT_PREFIX = /^(?:this|every|the|each|all|one|\d+)\s+/i;

export function parseLoadout(html: string): LoadoutSection[] {
  const sections: LoadoutSection[] = [];
  for (const match of html.matchAll(SECTION)) {
    const items = match[2]
      .split(';')
      .map((item) => item.trim().replace(/\.$/, '').replace(/^\d+\s+/, '').toLowerCase())
      .filter((item) => item !== '');
    sections.push({ subject: match[1].replace(SUBJECT_PREFIX, '').trim().toLowerCase(), items });
  }
  return sections;
}

// "Bolt Rifle - Focused Fire" → "bolt rifle": los modos de un arma cuentan como esa arma
export function weaponBaseName(weaponName: string): string {
  return weaponName.split(' - ')[0].trim().toLowerCase();
}

// "lascannons" vale para "Lascannon" (en el loadout los nombres pueden ir en plural)
export function itemMatches(item: string, weaponName: string): boolean {
  const base = weaponBaseName(weaponName);
  return item === base || item === `${base}s` || item === `${base}es`;
}

function subjectMatches(subject: string, modelName: string): boolean {
  const name = modelName.toLowerCase();
  return subject === name || itemMatches(subject, name) || itemMatches(name, subject);
}

// Nombres de las armas que lleva por defecto una miniatura.
// Vale la sección que la nombra; si ninguna la nombra, las genéricas ("This model", "Every model")
// o, si solo hay una sección, esa. Si aun así no hay nada, devuelve [] (el combate usará todas).
export function defaultWeapons(
  sections: LoadoutSection[],
  modelName: string,
  weaponNames: string[]
): string[] {
  const own = sections.filter((s) => subjectMatches(s.subject, modelName));
  const generic = sections.filter((s) => s.subject === 'model' || s.subject === 'models');
  const chosen = own.length > 0 ? own : generic.length > 0 ? generic : sections.length === 1 ? sections : [];
  const items = chosen.flatMap((s) => s.items);
  return weaponNames.filter((name) => items.some((item) => itemMatches(item, name)));
}
