// Reglas básicas de una tirada. Todos los "objetivos" son el valor mínimo del d6: 4 significa 4+.

export const CRITICAL_ROLL = 6;

// Impactar: d6 ≥ HP. Un 6 siempre impacta (crítico) y un 1 siempre falla.
export function hitSucceeds(roll: number, skill: number): boolean {
  return roll === CRITICAL_ROLL || (roll !== 1 && roll >= skill);
}

// Herir: Fuerza contra Resistencia
export function woundTarget(strength: number, toughness: number): number {
  if (strength >= toughness * 2) {
    return 2;
  }
  if (strength > toughness) {
    return 3;
  }
  if (strength === toughness) {
    return 4;
  }
  if (strength * 2 <= toughness) {
    return 6;
  }
  return 5;
}

// Un 1 siempre falla al herir; el crítico lo decide quien llama (normalmente 6, menos con Anti-X)
export function woundSucceeds(roll: number, target: number, criticalOn = CRITICAL_ROLL): boolean {
  return roll >= criticalOn || (roll !== 1 && roll >= target);
}

// Salvación: la de armadura empeora con el FP (Sv 3+ con FP -2 → 5+); la invulnerable no.
// Se usa la mejor de las dos. Devuelve null si no hay salvación posible (peor que 6+).
export function saveTarget(save: number, ap: number, invuln: number | null): number | null {
  const armour = save - ap; // ap es 0 o negativo: restar un negativo empeora la salvación
  const best = Math.min(armour, invuln ?? Infinity);
  return best > 6 ? null : best;
}

// Un 1 siempre falla al salvar
export function saveSucceeds(roll: number, target: number): boolean {
  return roll !== 1 && roll >= target;
}
