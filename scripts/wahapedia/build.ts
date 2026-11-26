// Junta las tablas de Wahapedia por datasheet_id y monta las unidades de units.json
import type {
  FactionData,
  ModelProfile,
  PointsOption,
  UnitData,
  UnitKind,
  UnitsFile,
  WeaponProfile,
} from '../../src/data/types.ts';
import { type Row, groupBy, requireColumns } from './csv.ts';
import {
  parseAp,
  parseDice,
  parseRange,
  parseStat,
  parseTraits,
  requireStat,
} from './convert.ts';
import { defaultWeapons, parseLoadout } from './loadout.ts';

export interface RawTables {
  factions: Row[];
  datasheets: Row[];
  models: Row[];
  wargear: Row[];
  costs: Row[];
  keywords: Row[];
  lastUpdate: Row[];
}

export interface BuildResult {
  file: UnitsFile;
  warnings: string[]; // filas descartadas, para revisarlas a mano si hace falta
}

// Roles que no son unidades con las que combatir
const EXCLUDED_ROLES = new Set(['Fortifications']);

// Columnas que se usan de cada tabla: si Wahapedia cambia alguna, el importador avisa
export function checkColumns(tables: RawTables): void {
  requireColumns(tables.factions, ['id', 'name'], 'Factions.csv');
  requireColumns(tables.datasheets, ['id', 'name', 'faction_id', 'role', 'loadout', 'virtual'], 'Datasheets.csv');
  requireColumns(
    tables.models,
    ['datasheet_id', 'line', 'name', 'M', 'T', 'Sv', 'inv_sv', 'W', 'Ld', 'OC'],
    'Datasheets_models.csv'
  );
  requireColumns(
    tables.wargear,
    ['datasheet_id', 'line', 'line_in_wargear', 'name', 'description', 'range', 'type', 'A', 'BS_WS', 'S', 'AP', 'D'],
    'Datasheets_wargear.csv'
  );
  requireColumns(tables.costs, ['datasheet_id', 'description', 'cost'], 'Datasheets_models_cost.csv');
  requireColumns(tables.keywords, ['datasheet_id', 'keyword'], 'Datasheets_keywords.csv');
  requireColumns(tables.lastUpdate, ['last_update'], 'Last_update.csv');
}

// La silueta: lo grande manda (un personaje sobre un monstruo se dibuja como monstruo)
export function unitKind(keywords: string[]): UnitKind {
  const has = (k: string) => keywords.some((keyword) => keyword.toLowerCase() === k);
  if (has('vehicle')) {
    return 'vehicle';
  }
  if (has('monster')) {
    return 'monster';
  }
  if (has('character')) {
    return 'character';
  }
  return 'infantry';
}

function byLine(a: Row, b: Row): number {
  return Number(a.line) - Number(b.line) || Number(a.line_in_wargear ?? 0) - Number(b.line_in_wargear ?? 0);
}

function buildModel(row: Row, unitName: string, loadout: string[]): ModelProfile {
  const what = `${unitName} / ${row.name}`;
  return {
    name: row.name,
    move: parseStat(row.M),
    toughness: requireStat(row.T, `${what}: R`),
    save: requireStat(row.Sv, `${what}: Sv`),
    invuln: parseStat(row.inv_sv),
    wounds: requireStat(row.W, `${what}: H`),
    leadership: parseStat(row.Ld),
    oc: parseStat(row.OC),
    loadout,
  };
}

// Devuelve undefined si la fila no es un arma utilizable (filas vacías o equipo sin perfil)
function buildWeapon(row: Row, unitName: string, warnings: string[]): WeaponProfile | undefined {
  const strength = parseStat(row.S);
  const attacks = parseDice(row.A);
  const damage = parseDice(row.D);
  if (!row.name || strength === null) {
    return undefined; // sin nombre o sin Fuerza: no es un arma, no hace falta avisar
  }
  if (attacks === null || damage === null) {
    warnings.push(`${unitName} / ${row.name}: A="${row.A}" D="${row.D}" no son tiradas válidas`);
    return undefined;
  }
  return {
    name: row.name,
    type: row.type.toLowerCase() === 'melee' ? 'melee' : 'ranged',
    range: parseRange(row.range),
    attacks,
    skill: parseStat(row.BS_WS),
    strength,
    ap: parseAp(row.AP),
    damage,
    traits: parseTraits(row.description),
  };
}

// Las filas sin coste son títulos de sección:
// - de tramo de precio: "YOUR UNIT COSTS", "YOUR 1ST TO 2ND UNITS COST", "YOUR 3RD+ UNIT COSTS"…
//   (en 11ª edición, repetir la misma unidad sale más caro)
// - de mejoras de equipo: "WARGEAR OPTIONS" ("per Multi-melta = 10"): NO es el precio de la unidad
// - de composición: '<div class="dsHeaderComp">1 Kill Team Sergeant</div>': no cambia de tramo
function costSection(description: string): 'tier' | 'wargear' | 'composition' {
  if (/UNITS? COSTS?/i.test(description)) {
    return 'tier';
  }
  return /WARGEAR OPTIONS/i.test(description) ? 'wargear' : 'composition';
}

// Precio normal de la unidad: solo las filas del primer tramo, sin repetir y de menor a mayor
export function buildPoints(rows: Row[]): PointsOption[] {
  const seen = new Map<string, PointsOption>();
  let inWargear = false;
  for (const row of [...rows].sort(byLine)) {
    const points = parseStat(row.cost);
    if (points === null) {
      const section = costSection(row.description);
      // Un título de tramo después de tener precios abre el segundo tramo: ya tenemos el primero.
      // Si llega sin precios todavía (títulos seguidos), sigue siendo el primero.
      if (section === 'tier' && seen.size > 0) {
        break;
      }
      if (section !== 'composition') {
        inWargear = section === 'wargear';
      }
      continue;
    }
    if (inWargear || /^per /i.test(row.description)) {
      continue;
    }
    const key = `${row.description}|${points}`;
    if (!seen.has(key)) {
      seen.set(key, { models: row.description, points });
    }
  }
  return [...seen.values()].sort((a, b) => a.points - b.points);
}

export function buildUnitsFile(tables: RawTables, factionIds: string[]): BuildResult {
  checkColumns(tables);
  const warnings: string[] = [];
  const wanted = new Set(factionIds);

  const factions: FactionData[] = factionIds.map((id) => {
    const row = tables.factions.find((f) => f.id === id);
    if (!row) {
      throw new Error(`La facción "${id}" no está en Factions.csv`);
    }
    return { id: row.id, name: row.name };
  });

  const models = groupBy(tables.models, 'datasheet_id');
  const wargear = groupBy(tables.wargear, 'datasheet_id');
  const costs = groupBy(tables.costs, 'datasheet_id');
  const keywords = groupBy(tables.keywords, 'datasheet_id');

  const units: UnitData[] = [];
  for (const sheet of tables.datasheets) {
    if (!wanted.has(sheet.faction_id) || sheet.virtual === 'true' || EXCLUDED_ROLES.has(sheet.role)) {
      continue;
    }

    const unitKeywords = [...new Set((keywords.get(sheet.id) ?? []).map((k) => k.keyword))];
    const unitWeapons = [...(wargear.get(sheet.id) ?? [])]
      .sort(byLine)
      .map((w) => buildWeapon(w, sheet.name, warnings))
      .filter((w): w is WeaponProfile => w !== undefined);
    const loadout = parseLoadout(sheet.loadout);
    const weaponNames = unitWeapons.map((w) => w.name);
    const unitModels = [...(models.get(sheet.id) ?? [])]
      .sort(byLine)
      .map((m) => buildModel(m, sheet.name, defaultWeapons(loadout, m.name, weaponNames)));
    for (const model of unitModels) {
      if (model.loadout.length === 0 && unitWeapons.length > 0) {
        warnings.push(`${sheet.faction_id} ${sheet.name} / ${model.name}: loadout sin leer (usará todas las armas)`);
      }
    }
    const points = buildPoints(costs.get(sheet.id) ?? []);

    // Sin perfil, sin armas o sin puntos no se puede combatir con ella ni reclutarla
    const missing = [
      unitModels.length === 0 ? 'perfil' : '',
      unitWeapons.length === 0 ? 'armas' : '',
      points.length === 0 ? 'puntos' : '',
    ].filter(Boolean);
    if (missing.length > 0) {
      warnings.push(`${sheet.faction_id} ${sheet.name}: descartada (sin ${missing.join(', ')})`);
      continue;
    }

    units.push({
      id: sheet.id,
      name: sheet.name,
      faction: sheet.faction_id,
      role: sheet.role,
      kind: unitKind(unitKeywords),
      keywords: unitKeywords,
      models: unitModels,
      weapons: unitWeapons,
      points,
    });
  }

  units.sort((a, b) => a.faction.localeCompare(b.faction) || a.name.localeCompare(b.name));

  return {
    file: {
      source: 'Wahapedia (wahapedia.ru) data export, 11th edition',
      exportedAt: tables.lastUpdate[0]?.last_update ?? '',
      factions,
      units,
    },
    warnings,
  };
}
