import * as assert from 'assert';
import { EMPTY_STATS, GameState } from '../core/state';
import { mergeStates } from '../core/syncMerge';

function game(requisition: number, rpEarned: number, updatedAt = 1): GameState {
  return { requisition, updatedAt, stats: { ...EMPTY_STATS, rpEarned } };
}

suite('combinar partidas', () => {
  test('con base, se suman los RP ganados en cada ordenador', () => {
    const base = game(100, 100);
    const local = game(130, 130);  // +30 aquí
    const remote = game(150, 150); // +50 en el otro
    const merged = mergeStates(base, local, remote);
    assert.strictEqual(merged.requisition, 180);
    assert.strictEqual(merged.stats.rpEarned, 180);
  });

  test('con base, un gasto en un lado se respeta', () => {
    const base = game(100, 100);
    const local = game(40, 100);   // gastó 60
    const remote = game(120, 120); // ganó 20
    assert.strictEqual(mergeStates(base, local, remote).requisition, 60);
  });

  test('nunca queda en negativo', () => {
    const base = game(100, 100);
    assert.strictEqual(mergeStates(base, game(0, 100), game(0, 100)).requisition, 0);
  });

  test('sin base se queda con lo mayor para no perder nada', () => {
    const merged = mergeStates(undefined, game(30, 30), game(80, 90));
    assert.strictEqual(merged.requisition, 80);
    assert.strictEqual(merged.stats.rpEarned, 90);
  });

  test('la marca de tiempo es la más reciente', () => {
    assert.strictEqual(mergeStates(undefined, game(1, 1, 500), game(1, 1, 900)).updatedAt, 900);
  });
});
