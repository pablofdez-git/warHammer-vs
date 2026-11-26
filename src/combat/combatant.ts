import { ModelProfile, UnitData } from '../data/types';

// Una unidad en combate: un grupo de miniaturas iguales.
// El daño va a una miniatura cada vez; el que sobra al matarla se pierde (como en el juego).
export interface Combatant {
  unit: UnitData;
  profile: ModelProfile; // perfil con el que se defiende toda la unidad
  models: number;        // miniaturas al empezar
  modelsLeft: number;
  woundsLeft: number;    // heridas que le quedan a la miniatura que está recibiendo daño
}

// El perfil de la tropa básica: el de menos heridas (Boy antes que Nob)
export function mainProfile(unit: UnitData): ModelProfile {
  return unit.models.reduce((best, model) => (model.wounds < best.wounds ? model : best));
}

// Tamaño mínimo de la unidad: "10 models" → 10, "1 model" → 1
export function modelCount(unit: UnitData): number {
  const match = unit.points[0]?.models.match(/\d+/);
  return match ? Math.max(1, Number(match[0])) : 1;
}

export function createCombatant(unit: UnitData): Combatant {
  const profile = mainProfile(unit);
  const models = modelCount(unit);
  return { unit, profile, models, modelsLeft: models, woundsLeft: profile.wounds };
}

export function isDestroyed(combatant: Combatant): boolean {
  return combatant.modelsLeft === 0;
}

// Heridas que le quedan a toda la unidad (para la barra de vida)
export function totalWoundsLeft(combatant: Combatant): number {
  if (isDestroyed(combatant)) {
    return 0;
  }
  return (combatant.modelsLeft - 1) * combatant.profile.wounds + combatant.woundsLeft;
}

export function totalWounds(combatant: Combatant): number {
  return combatant.models * combatant.profile.wounds;
}

export interface DamageResult {
  combatant: Combatant; // el estado nuevo (el original no se modifica)
  dealt: number;        // daño que ha hecho de verdad (sin el que se pierde)
  slain: boolean;       // si ha matado a una miniatura
}

export function applyDamage(combatant: Combatant, damage: number): DamageResult {
  if (isDestroyed(combatant)) {
    return { combatant, dealt: 0, slain: false };
  }
  const dealt = Math.min(damage, combatant.woundsLeft);
  const woundsLeft = combatant.woundsLeft - dealt;
  if (woundsLeft > 0) {
    return { combatant: { ...combatant, woundsLeft }, dealt, slain: false };
  }
  const modelsLeft = combatant.modelsLeft - 1;
  return {
    combatant: { ...combatant, modelsLeft, woundsLeft: modelsLeft > 0 ? combatant.profile.wounds : 0 },
    dealt,
    slain: true,
  };
}
