import { WeaponProfile } from '../data/types';
import { Combatant, applyDamage, isDestroyed } from './combatant';
import { D6Roller, rollDice } from './dice';
import {
  CRITICAL_ROLL,
  hitSucceeds,
  saveSucceeds,
  saveTarget,
  woundSucceeds,
  woundTarget,
} from './rules';
import { weaponRules } from './traits';
import { pickWeapon } from './weaponChoice';

// Un dado tirado, tal como lo enseñará el Auspex
export interface DieRoll {
  value: number;
  success: boolean;
  critical: boolean;
  rerolledFrom?: number; // Twin-linked: lo que salió antes de repetir
}

// Una ráfaga se tira por fases, como en la mesa: todos los impactos, luego las heridas…
export interface VolleyResult {
  weapon: WeaponProfile;
  attacks: number;
  hitRolls: DieRoll[];     // vacío si el arma impacta sola (Torrent)
  autoHits: number;        // impactos sin tirar (Torrent)
  sustainedHits: number;   // impactos extra por críticos (Sustained Hits)
  woundTarget: number;     // con qué se hiere (F contra R)
  woundRolls: DieRoll[];
  lethalWounds: number;    // heridas sin tirar por críticos al impactar (Lethal Hits)
  saveTarget: number | null; // null: no hay salvación posible
  saveRolls: DieRoll[];    // success = el defensor ha salvado
  unsavable: number;       // heridas sin salvación (Devastating Wounds o FP demasiado alto)
  damageRolls: number[];   // daño de cada herida no salvada que llegó a aplicarse
  damageDealt: number;
  modelsSlain: number;
  defender: Combatant;     // cómo queda el defensor
}

// Tira `count` dados y aplica `check` a cada uno
function rollMany(count: number, roll: D6Roller, check: (value: number) => DieRoll): DieRoll[] {
  return Array.from({ length: count }, () => check(roll()));
}

export function resolveVolley(attacker: Combatant, target: Combatant, roll: D6Roller): VolleyResult {
  const weapon = pickWeapon(attacker, target);
  const rules = weaponRules(weapon, target.unit.keywords);

  // Ataques: los del arma por cada miniatura viva (si son dados, cada miniatura tira los suyos)
  let attacks = 0;
  for (let i = 0; i < attacker.modelsLeft; i += 1) {
    attacks += rollDice(weapon.attacks, roll);
  }

  // 1. Impactar
  const skill = weapon.skill ?? 2;
  const hitRolls = rules.autoHit
    ? []
    : rollMany(attacks, roll, (value) => ({
        value,
        success: hitSucceeds(value, skill),
        critical: value === CRITICAL_ROLL,
      }));
  const autoHits = rules.autoHit ? attacks : 0;
  const criticalHits = hitRolls.filter((d) => d.critical).length;

  let sustainedHits = 0;
  if (rules.sustainedHits) {
    for (let i = 0; i < criticalHits; i += 1) {
      sustainedHits += rollDice(rules.sustainedHits, roll);
    }
  }
  // Con Lethal Hits, los críticos hieren solos y no se tiran para herir
  const lethalWounds = rules.lethalHits ? criticalHits : 0;
  const hitsToWound =
    hitRolls.filter((d) => d.success).length - lethalWounds + autoHits + sustainedHits;

  // 2. Herir
  const toWound = woundTarget(weapon.strength, target.profile.toughness);
  const checkWound = (value: number): DieRoll => ({
    value,
    success: woundSucceeds(value, toWound, rules.criticalWoundOn),
    critical: value >= rules.criticalWoundOn,
  });
  const woundRolls = rollMany(hitsToWound, roll, (value) => {
    const first = checkWound(value);
    if (first.success || !rules.rerollWounds) {
      return first;
    }
    return { ...checkWound(roll()), rerolledFrom: value };
  });

  // 3. Salvar. Con Devastating Wounds, los críticos al herir no se pueden salvar
  const wounds = woundRolls.filter((d) => d.success);
  const devastating = rules.devastatingWounds ? wounds.filter((d) => d.critical).length : 0;
  const toSave = saveTarget(target.profile.save, weapon.ap, target.profile.invuln);
  const savable = toSave === null ? 0 : wounds.length + lethalWounds - devastating;
  const saveRolls =
    toSave === null
      ? []
      : rollMany(savable, roll, (value) => ({
          value,
          success: saveSucceeds(value, toSave),
          critical: false,
        }));
  const unsavable = toSave === null ? wounds.length + lethalWounds : devastating;
  const unsaved = saveRolls.filter((d) => !d.success).length + unsavable;

  // 4. Daño: herida a herida, hasta que no quede nadie
  let defender = target;
  const damageRolls: number[] = [];
  let damageDealt = 0;
  let modelsSlain = 0;
  for (let i = 0; i < unsaved && !isDestroyed(defender); i += 1) {
    const damage = rollDice(weapon.damage, roll);
    const result = applyDamage(defender, damage);
    damageRolls.push(damage);
    damageDealt += result.dealt;
    modelsSlain += result.slain ? 1 : 0;
    defender = result.combatant;
  }

  return {
    weapon,
    attacks,
    hitRolls,
    autoHits,
    sustainedHits,
    woundTarget: toWound,
    woundRolls,
    lethalWounds,
    saveTarget: toSave,
    saveRolls,
    unsavable,
    damageRolls,
    damageDealt,
    modelsSlain,
    defender,
  };
}
