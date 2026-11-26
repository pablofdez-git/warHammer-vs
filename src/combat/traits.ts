import { DiceValue, WeaponProfile } from '../data/types';
import { CRITICAL_ROLL } from './rules';

// Reglas de arma que se aplican en el Auspex. Las que dependen de distancias o del movimiento
// (Rapid Fire, Melta, Blast, Heavy…) se ignoran: aquí no hay tablero.
export interface WeaponRules {
  autoHit: boolean;                 // Torrent: impacta sin tirar
  sustainedHits: DiceValue | null;  // un crítico al impactar da estos impactos extra
  lethalHits: boolean;              // un crítico al impactar hiere sin tirar
  devastatingWounds: boolean;       // un crítico al herir no permite salvación
  criticalWoundOn: number;          // con qué se hiere crítico: 6, o menos con Anti-X N+
  rerollWounds: boolean;            // Twin-linked: repite las tiradas de herir falladas
}

// "monster/vehicle" → ¿tiene el objetivo alguna de esas palabras clave?
// "non-monster/vehicle" → ¿no tiene ninguna?
export function conditionApplies(condition: string, targetKeywords: string[]): boolean {
  const keywords = targetKeywords.map((k) => k.toLowerCase());
  const negated = condition.startsWith('non-');
  const wanted = (negated ? condition.slice(4) : condition).split('/').map((k) => k.trim());
  const matches = wanted.some((k) => keywords.includes(k));
  return negated ? !matches : matches;
}

export function weaponRules(weapon: WeaponProfile, targetKeywords: string[]): WeaponRules {
  const rules: WeaponRules = {
    autoHit: weapon.skill === null,
    sustainedHits: null,
    lethalHits: false,
    devastatingWounds: false,
    criticalWoundOn: CRITICAL_ROLL,
    rerollWounds: false,
  };

  for (const trait of weapon.traits) {
    // "lethal hits: non-monster/vehicle" → regla "lethal hits" con condición "non-monster/vehicle"
    const [name, condition] = trait.split(':').map((part) => part.trim());
    if (condition && !conditionApplies(condition, targetKeywords)) {
      continue;
    }

    const sustained = name.match(/^sustained hits (\d+|d3)$/);
    const anti = name.match(/^anti-(.+) ([2-6])\+$/);

    if (name === 'torrent') {
      rules.autoHit = true;
    } else if (sustained) {
      rules.sustainedHits = sustained[1].toUpperCase();
    } else if (name === 'lethal hits') {
      rules.lethalHits = true;
    } else if (name === 'devastating wounds') {
      rules.devastatingWounds = true;
    } else if (name === 'twin-linked') {
      rules.rerollWounds = true;
    } else if (anti && conditionApplies(anti[1], targetKeywords)) {
      rules.criticalWoundOn = Math.min(rules.criticalWoundOn, Number(anti[2]));
    }
  }
  return rules;
}
