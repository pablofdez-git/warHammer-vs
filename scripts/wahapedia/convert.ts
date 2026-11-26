// Convierte los valores de texto de Wahapedia a lo que guarda units.json
import type { DiceValue } from '../../src/data/types.ts';

// Valores que significan "no tiene" o "no aplica"
const EMPTY_VALUES = new Set(['', '-', 'N/A']);

// Número de una característica: '6"' → 6, '3+' → 3, '4*' → 4, '20+"' → 20, '-' → null
export function parseStat(value: string): number | null {
  if (EMPTY_VALUES.has(value.trim())) {
    return null;
  }
  const match = value.match(/-?\d+/);
  return match ? Number(match[0]) : null;
}

// Como parseStat, pero la característica es obligatoria: si no hay número, error
export function requireStat(value: string, what: string): number {
  const stat = parseStat(value);
  if (stat === null) {
    throw new Error(`${what}: "${value}" no es un número`);
  }
  return stat;
}

// FP: '-2' → -2; '0' o '-' → 0
export function parseAp(value: string): number {
  return parseStat(value) ?? 0;
}

// Alcance: 'Melee' → null (cuerpo a cuerpo); '24"' o '24' → 24
export function parseRange(value: string): number | null {
  return value.trim().toLowerCase() === 'melee' ? null : parseStat(value);
}

// Tiradas válidas: un número ("3"), dados ("D6", "2D3") o dados más un número ("D6+1", "2D6+3")
const DICE_PATTERN = /^(\d+|\d*D[36](\+\d+)?)$/;

export function parseDice(value: string): DiceValue | null {
  const normalized = value.trim().toUpperCase().replace(/\s/g, '');
  return DICE_PATTERN.test(normalized) ? normalized : null;
}

// Reglas del arma: "ASSAULT, Rapid Fire 1" → ["assault", "rapid fire 1"]
export function parseTraits(description: string): string[] {
  return description
    .split(',')
    .map((trait) => trait.trim().toLowerCase())
    .filter((trait) => trait !== '');
}
