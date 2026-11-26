import { DiceValue } from '../data/types';

// Todo el azar del combate pasa por aquí: una función que devuelve un d6 (de 1 a 6).
// En el juego es aleatoria; en los tests se le pasan los resultados que se quieren.
export type D6Roller = () => number;

export const randomD6: D6Roller = () => Math.floor(Math.random() * 6) + 1;

export interface DiceExpression {
  count: number;  // cuántos dados (0 si es un número fijo)
  sides: 3 | 6;
  bonus: number;  // lo que se suma
}

const DICE_PATTERN = /^(\d*)D([36])(?:\+(\d+))?$/;

// "3" → 0 dados + 3 · "D6" → 1d6 · "2D6+3" → 2d6 + 3 · "D3+1" → 1d3 + 1
export function parseDiceExpression(value: DiceValue): DiceExpression {
  if (/^\d+$/.test(value)) {
    return { count: 0, sides: 6, bonus: Number(value) };
  }
  const match = value.match(DICE_PATTERN);
  if (!match) {
    throw new Error(`"${value}" no es una tirada válida`);
  }
  return {
    count: match[1] === '' ? 1 : Number(match[1]),
    sides: match[2] === '3' ? 3 : 6,
    bonus: match[3] ? Number(match[3]) : 0,
  };
}

// Un D3 se tira con un d6: 1-2 → 1, 3-4 → 2, 5-6 → 3
export function rollDice(value: DiceValue, roll: D6Roller): number {
  const { count, sides, bonus } = parseDiceExpression(value);
  let total = bonus;
  for (let i = 0; i < count; i += 1) {
    const d6 = roll();
    total += sides === 3 ? Math.ceil(d6 / 2) : d6;
  }
  return total;
}

// Media de una tirada (para elegir arma sin tirar): D6 → 3,5 · D3 → 2
export function averageDice(value: DiceValue): number {
  const { count, sides, bonus } = parseDiceExpression(value);
  return count * (sides === 3 ? 2 : 3.5) + bonus;
}
