import { Combatant, isDestroyed } from './combatant';
import { D6Roller } from './dice';
import { VolleyResult, resolveVolley } from './volley';

export type RoundOutcome = 'continue' | 'enemyDestroyed' | 'playerDestroyed';

export interface RoundResult {
  playerVolley: VolleyResult;
  enemyVolley: VolleyResult | null; // null si el enemigo no sobrevive para responder
  player: Combatant;
  enemy: Combatant;
  outcome: RoundOutcome;
}

// "Abrir fuego": disparas tú y, si el enemigo sobrevive, responde
export function resolveRound(player: Combatant, enemy: Combatant, roll: D6Roller): RoundResult {
  const playerVolley = resolveVolley(player, enemy, roll);
  const enemyAfter = playerVolley.defender;

  if (isDestroyed(enemyAfter)) {
    return { playerVolley, enemyVolley: null, player, enemy: enemyAfter, outcome: 'enemyDestroyed' };
  }

  const enemyVolley = resolveVolley(enemyAfter, player, roll);
  const playerAfter = enemyVolley.defender;
  return {
    playerVolley,
    enemyVolley,
    player: playerAfter,
    enemy: enemyAfter,
    outcome: isDestroyed(playerAfter) ? 'playerDestroyed' : 'continue',
  };
}
