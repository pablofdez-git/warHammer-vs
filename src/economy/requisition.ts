import { StateManager } from '../core/state';

// Ajusta estos valores a tu gusto para equilibrar el juego
export const MIN_CHARS_TO_REWARD = 20; // por debajo de esto, el guardado no da RP
export const CHARS_PER_RP = 15;        // cuántos caracteres valen 1 RP (sin contar espacios)

export function rpForChanges(changedChars: number): number {
  if (changedChars < MIN_CHARS_TO_REWARD) {
    return 0;
  }
  return Math.floor(changedChars / CHARS_PER_RP);
}

// Paga los RP de un guardado según los caracteres nuevos. Devuelve cuántos ha dado.
export async function rewardForSave(state: StateManager, changedChars: number): Promise<number> {
  const rp = rpForChanges(changedChars);
  if (rp > 0) {
    await state.update((s) => {
      s.requisition += rp;
      s.stats.rpEarned += rp;
      s.stats.charsWritten += changedChars;
    });
  }
  return rp;
}
