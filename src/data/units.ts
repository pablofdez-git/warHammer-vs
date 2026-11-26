import * as fs from 'fs';
import * as path from 'path';
import { UnitData, UnitsFile } from './types';

// Carga data/units.json, que va empaquetado en la extensión (no se descarga nada).
// extensionPath es context.extensionPath (la carpeta de la extensión instalada).
export function loadUnits(extensionPath: string): UnitsFile {
  const file = path.join(extensionPath, 'data', 'units.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')) as UnitsFile;
}

export function unitsOfFaction(data: UnitsFile, factionId: string): UnitData[] {
  return data.units.filter((unit) => unit.faction === factionId);
}
