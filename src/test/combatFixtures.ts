import { ModelProfile, UnitData, WeaponProfile } from '../data/types';
import { D6Roller } from '../combat/dice';

// Dados trucados: devuelve los valores en orden y falla si se tiran más de los previstos
// (así un test detecta si el motor tira dados de más o de menos)
export function scripted(values: number[]): D6Roller & { remaining: () => number } {
  const queue = [...values];
  const roller = () => {
    const value = queue.shift();
    if (value === undefined) {
      throw new Error('Se han tirado más dados de los previstos en el test');
    }
    return value;
  };
  return Object.assign(roller, { remaining: () => queue.length });
}

export function weapon(overrides: Partial<WeaponProfile> = {}): WeaponProfile {
  return {
    name: 'Bolter', type: 'ranged', range: 24, attacks: '1', skill: 3,
    strength: 4, ap: 0, damage: '1', traits: [], ...overrides,
  };
}

export function model(overrides: Partial<ModelProfile> = {}): ModelProfile {
  return {
    name: 'Soldado', move: 6, toughness: 4, save: 3, invuln: null,
    wounds: 1, leadership: 6, oc: 1, loadout: [], ...overrides,
  };
}

export function unit(overrides: Partial<UnitData> = {}): UnitData {
  return {
    id: '1', name: 'Unidad', faction: 'SM', role: 'Battleline', kind: 'infantry',
    keywords: ['Infantry'], models: [model()], weapons: [weapon()],
    points: [{ models: '1 model', points: 10 }], ...overrides,
  };
}
