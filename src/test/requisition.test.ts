import * as assert from 'assert';
import { StateManager } from '../core/state';
import { CHARS_PER_RP, MIN_CHARS_TO_REWARD, rewardForSave, rpForChanges } from '../economy/requisition';
import { FakeMemento } from './fakeMemento';

suite('Puntos de Requisa', () => {
  test('rpForChanges respeta el mínimo y redondea hacia abajo', () => {
    assert.strictEqual(rpForChanges(0), 0);
    assert.strictEqual(rpForChanges(MIN_CHARS_TO_REWARD - 1), 0);
    assert.strictEqual(rpForChanges(CHARS_PER_RP * 3), 3);
    assert.strictEqual(rpForChanges(CHARS_PER_RP * 4 - 1), 3);
  });

  test('rewardForSave suma los RP y apunta los contadores', async () => {
    const state = new StateManager(new FakeMemento());
    const gained = await rewardForSave(state, CHARS_PER_RP * 2);

    const s = state.get();
    assert.strictEqual(gained, 2);
    assert.strictEqual(s.requisition, 2);
    assert.strictEqual(s.stats.rpEarned, 2);
    assert.strictEqual(s.stats.charsWritten, CHARS_PER_RP * 2);
    assert.ok(s.updatedAt > 0);
  });

  test('un guardado sin suficiente texto no cambia la partida', async () => {
    const state = new StateManager(new FakeMemento());
    assert.strictEqual(await rewardForSave(state, 5), 0);
    assert.strictEqual(state.get().updatedAt, 0); // ni siquiera se marca para sincronizar
  });
});
