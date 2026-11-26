// Forma de data/units.json. La usan el script de importación (lo escribe) y la extensión (lo lee):
// si cambias algo aquí, TypeScript te avisará en los dos sitios.

// Tirada de dados o número fijo, tal como viene en Wahapedia: "3", "D6", "D3+1", "2D6+3"…
export type DiceValue = string;

// Silueta que se dibuja en el Auspex
export type UnitKind = 'infantry' | 'character' | 'monster' | 'vehicle';

export interface ModelProfile {
  name: string;
  move: number | null;       // pulgadas; null si no se mueve (o no aplica)
  toughness: number;         // R
  save: number;              // Sv: 3 significa 3+
  invuln: number | null;     // salvación invulnerable (4 = 4+); null si no tiene
  wounds: number;            // H
  leadership: number | null; // L: 6 significa 6+
  oc: number | null;         // control de objetivo
  loadout: string[];         // nombres de las armas (de UnitData.weapons) que lleva por defecto;
                             // vacío si no se pudo leer: entonces se usan todas
}

export interface WeaponProfile {
  name: string;
  type: 'ranged' | 'melee';
  range: number | null;      // pulgadas; null en cuerpo a cuerpo
  attacks: DiceValue;        // A
  skill: number | null;      // HP/HA: 3 significa 3+; null = impacta solo (Torrent)
  strength: number;          // F
  ap: number;                // FP: 0, -1, -2…
  damage: DiceValue;         // D
  traits: string[];          // reglas en minúsculas: "rapid fire 1", "torrent", "lethal hits"…
}

export interface PointsOption {
  models: string;            // "5 models", "1 model"…
  points: number;
}

export interface UnitData {
  id: string;                // id de la ficha en Wahapedia
  name: string;
  faction: string;           // id de la facción: "SM", "CSM", "ORK"…
  role: string;              // "Battleline", "Infantry Character"…
  kind: UnitKind;
  keywords: string[];
  models: ModelProfile[];
  weapons: WeaponProfile[];
  points: PointsOption[];    // de menor a mayor
}

export interface FactionData {
  id: string;
  name: string;
}

export interface UnitsFile {
  source: string;            // de dónde salen los datos (para el aviso "powered by Wahapedia")
  exportedAt: string;        // fecha de la exportación de Wahapedia (Last_update.csv)
  factions: FactionData[];
  units: UnitData[];
}
