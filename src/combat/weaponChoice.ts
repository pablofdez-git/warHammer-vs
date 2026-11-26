import { WeaponProfile } from '../data/types';
import { Combatant } from './combatant';
import { averageDice } from './dice';
import { saveTarget, woundTarget } from './rules';
import { weaponRules } from './traits';

// Probabilidad de sacar `target` o más en un d6 (un 1 siempre falla)
function chance(target: number): number {
  return (7 - Math.max(2, target)) / 6;
}

// Daño medio que hace UNA miniatura con esta arma contra el defensor (aproximado, sin críticos).
// El daño de cada herida no pasa de las heridas de una miniatura: el que sobra se pierde.
export function expectedDamage(weapon: WeaponProfile, defender: Combatant): number {
  const rules = weaponRules(weapon, defender.unit.keywords);
  const hit = rules.autoHit || weapon.skill === null ? 1 : chance(weapon.skill);
  const wound = chance(woundTarget(weapon.strength, defender.profile.toughness));
  const save = saveTarget(defender.profile.save, weapon.ap, defender.profile.invuln);
  const unsaved = save === null ? 1 : 1 - chance(save);
  const damage = Math.min(averageDice(weapon.damage), defender.profile.wounds);
  return averageDice(weapon.attacks) * hit * wound * unsaved * damage;
}

// Armas que lleva por defecto el perfil con el que combate la unidad (no las opcionales:
// en una escuadra de 10 Boyz no todos llevan Rokkit). Si el loadout no se pudo leer, todas.
export function carriedWeapons(attacker: Combatant): WeaponProfile[] {
  const loadout = attacker.profile.loadout;
  const carried = attacker.unit.weapons.filter((w) => loadout.includes(w.name));
  return carried.length > 0 ? carried : attacker.unit.weapons;
}

// "Abrir fuego" usa la mejor arma a distancia que lleva; si no tiene, la mejor de cuerpo a cuerpo
export function pickWeapon(attacker: Combatant, defender: Combatant): WeaponProfile {
  const weapons = carriedWeapons(attacker);
  const ranged = weapons.filter((w) => w.type === 'ranged');
  const options = ranged.length > 0 ? ranged : weapons;
  return options.reduce((best, weapon) =>
    expectedDamage(weapon, defender) > expectedDamage(best, defender) ? weapon : best
  );
}
