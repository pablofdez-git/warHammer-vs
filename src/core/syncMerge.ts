import { GameState, GameStats } from './state';

// Con la base (la partida en la última sincronización) se suman los cambios de los dos lados.
// Sin base no se sabe qué cambió en cada uno, y se toma lo mayor para no perder nada.
export function mergeNumber(base: number | undefined, local: number, remote: number): number {
  if (base === undefined) {
    return Math.max(local, remote);
  }
  return Math.max(0, local + remote - base);
}

function mergeStats(base: GameStats | undefined, local: GameStats, remote: GameStats): GameStats {
  return {
    rpEarned: mergeNumber(base?.rpEarned, local.rpEarned, remote.rpEarned),
    rpSpent: mergeNumber(base?.rpSpent, local.rpSpent, remote.rpSpent),
    charsWritten: mergeNumber(base?.charsWritten, local.charsWritten, remote.charsWritten),
  };
}

// Combina dos partidas que han cambiado por separado.
// Las tres deben venir normalizadas (normalizeState). updatedAt lo pone quien la guarde.
// Cuando la partida tenga más campos (ejército, facción…), cada uno necesitará su regla aquí.
export function mergeStates(
  base: GameState | undefined,
  local: GameState,
  remote: GameState
): GameState {
  return {
    requisition: mergeNumber(base?.requisition, local.requisition, remote.requisition),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
    stats: mergeStats(base?.stats, local.stats, remote.stats),
  };
}
