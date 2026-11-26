// Importa los CSV de Wahapedia (descargados a mano en data/raw/) y genera data/units.json.
// Uso: npm run import-data
// Descarga: https://wahapedia.ru/wh40k11ed/the-rules/data-export/ (ficheros en RAW_FILES)
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './wahapedia/csv.ts';
import { type RawTables, buildUnitsFile } from './wahapedia/build.ts';
import type { UnitsFile } from '../src/data/types.ts';

// Facciones que se importan. Para añadir otra, pon aquí su id de Factions.csv (p. ej. "NEC")
const FACTIONS = ['SM', 'CSM', 'ORK'];

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.join(ROOT, 'data', 'raw');
const OUTPUT = path.join(ROOT, 'data', 'units.json');

const RAW_FILES: Record<keyof RawTables, string> = {
  factions: 'Factions.csv',
  datasheets: 'Datasheets.csv',
  models: 'Datasheets_models.csv',
  wargear: 'Datasheets_wargear.csv',
  costs: 'Datasheets_models_cost.csv',
  keywords: 'Datasheets_keywords.csv',
  lastUpdate: 'Last_update.csv',
};

async function readTables(): Promise<RawTables> {
  const tables: Partial<RawTables> = {};
  for (const [key, fileName] of Object.entries(RAW_FILES) as [keyof RawTables, string][]) {
    let text: string;
    try {
      text = await readFile(path.join(RAW_DIR, fileName), 'utf8');
    } catch {
      throw new Error(`No encuentro data/raw/${fileName}. Descárgalo de Wahapedia y vuelve a probar.`);
    }
    tables[key] = parseCsv(text, fileName);
  }
  return tables as RawTables;
}

// Una unidad por línea: ocupa casi lo mismo que sin espacios, y al actualizar los datos
// git enseña exactamente qué unidades han cambiado
function formatUnitsFile(file: UnitsFile): string {
  const { units, ...header } = file;
  const headerJson = JSON.stringify(header).slice(0, -1); // sin la "}" final
  const unitLines = units.map((unit) => `  ${JSON.stringify(unit)}`).join(',\n');
  return `${headerJson},\n "units": [\n${unitLines}\n ]\n}\n`;
}

async function main(): Promise<void> {
  const { file, warnings } = buildUnitsFile(await readTables(), FACTIONS);
  await writeFile(OUTPUT, formatUnitsFile(file), 'utf8');

  console.log(`Exportación de Wahapedia del ${file.exportedAt}`);
  for (const faction of file.factions) {
    const units = file.units.filter((u) => u.faction === faction.id);
    const kinds = new Map<string, number>();
    units.forEach((u) => kinds.set(u.kind, (kinds.get(u.kind) ?? 0) + 1));
    const detail = [...kinds].map(([kind, n]) => `${kind} ${n}`).join(', ');
    console.log(`  ${faction.id} ${faction.name}: ${units.length} unidades (${detail})`);
  }
  if (warnings.length > 0) {
    console.log(`\n${warnings.length} avisos:`);
    warnings.forEach((w) => console.log(`  - ${w}`));
  }
  console.log(`\nGuardado en ${path.relative(ROOT, OUTPUT)}`);
}

main().catch((error: unknown) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
