import * as vscode from 'vscode';

// Contadores que se van acumulando durante la partida (servirán para los desbloqueos)
export interface GameStats {
  rpEarned: number;     // Puntos de Requisa ganados en total
  rpSpent: number;      // gastados en la Armería
  charsWritten: number; // caracteres que han dado RP
}

export const EMPTY_STATS: GameStats = {
  rpEarned: 0,
  rpSpent: 0,
  charsWritten: 0,
};

// La partida. Irá creciendo en cada fase (facción, ejército, corrupción…):
// los campos nuevos se rellenan en normalizeState para que las partidas antiguas sigan valiendo
export interface GameState {
  requisition: number; // Puntos de Requisa (RP) disponibles
  updatedAt: number;   // momento (ms) del último cambio; sirve para sincronizar
  stats: GameStats;
}

const KEY = 'warhammerCompanion.state';

const DEFAULT_STATE: GameState = {
  requisition: 0,
  updatedAt: 0,
  stats: EMPTY_STATS,
};

// Copia una partida guardada (aquí o en el archivo de sincronización)
// y rellena lo que le falte, sin modificar el original
export function normalizeState(saved: GameState): GameState {
  const state: GameState = JSON.parse(JSON.stringify(saved));
  state.requisition = state.requisition ?? 0;
  state.updatedAt = state.updatedAt ?? 0;
  // Si se añaden contadores nuevos, en las partidas antiguas empiezan a 0
  state.stats = { ...EMPTY_STATS, ...state.stats };
  return state;
}

export class StateManager {
  private readonly emitter = new vscode.EventEmitter<void>();
  // La interfaz se suscribe aquí para refrescarse cuando el estado cambia
  readonly onDidChange = this.emitter.event;

  constructor(private readonly memento: vscode.Memento) {}

  get(): GameState {
    return normalizeState(this.memento.get<GameState>(KEY) ?? DEFAULT_STATE);
  }

  async update(change: (state: GameState) => void): Promise<void> {
    const state = this.get();
    change(state);
    state.updatedAt = Date.now();
    await this.memento.update(KEY, state);
    this.emitter.fire();
  }

  // Aplica una partida que viene de otro ordenador, conservando su marca de tiempo
  async replaceWith(state: GameState): Promise<void> {
    await this.memento.update(KEY, state);
    this.emitter.fire();
  }

  async reset(): Promise<void> {
    const fresh: GameState = JSON.parse(JSON.stringify(DEFAULT_STATE));
    fresh.updatedAt = Date.now(); // con fecha, para que el reinicio también se sincronice
    await this.memento.update(KEY, fresh);
    this.emitter.fire();
  }
}
