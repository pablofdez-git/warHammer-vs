import * as assert from 'assert';
import { averageDice, parseDiceExpression, rollDice } from '../combat/dice';
import { hitSucceeds, saveSucceeds, saveTarget, woundSucceeds, woundTarget } from '../combat/rules';
import { loadUnits } from '../data/units';
import { scripted } from './combatFixtures';
import * as path from 'path';

suite('combate: dados', () => {
  test('entiende números fijos y dados', () => {
    assert.deepStrictEqual(parseDiceExpression('3'), { count: 0, sides: 6, bonus: 3 });
    assert.deepStrictEqual(parseDiceExpression('D6'), { count: 1, sides: 6, bonus: 0 });
    assert.deepStrictEqual(parseDiceExpression('2D6+3'), { count: 2, sides: 6, bonus: 3 });
    assert.deepStrictEqual(parseDiceExpression('D3+1'), { count: 1, sides: 3, bonus: 1 });
    assert.throws(() => parseDiceExpression('D4'));
  });

  test('un D3 se tira con un d6 (1-2 → 1, 3-4 → 2, 5-6 → 3)', () => {
    assert.strictEqual(rollDice('D3', scripted([1])), 1);
    assert.strictEqual(rollDice('D3', scripted([4])), 2);
    assert.strictEqual(rollDice('D3', scripted([6])), 3);
  });

  test('suma dados y bonus; un número fijo no tira', () => {
    assert.strictEqual(rollDice('2D6+3', scripted([2, 5])), 10);
    const none = scripted([]);
    assert.strictEqual(rollDice('4', none), 4);
  });

  test('medias para elegir arma', () => {
    assert.strictEqual(averageDice('D6'), 3.5);
    assert.strictEqual(averageDice('D3+1'), 3);
    assert.strictEqual(averageDice('2'), 2);
  });

  test('todas las tiradas de units.json se pueden tirar', () => {
    const data = loadUnits(path.resolve(__dirname, '..', '..'));
    for (const unit of data.units) {
      for (const w of unit.weapons) {
        assert.doesNotThrow(() => parseDiceExpression(w.attacks), `${unit.name} ${w.name} A`);
        assert.doesNotThrow(() => parseDiceExpression(w.damage), `${unit.name} ${w.name} D`);
      }
    }
  });
});

suite('combate: tabla de Fuerza contra Resistencia', () => {
  test('cada fila de la tabla', () => {
    assert.strictEqual(woundTarget(8, 4), 2); // F ≥ 2×R
    assert.strictEqual(woundTarget(10, 4), 2);
    assert.strictEqual(woundTarget(5, 4), 3); // F > R
    assert.strictEqual(woundTarget(7, 4), 3);
    assert.strictEqual(woundTarget(4, 4), 4); // F = R
    assert.strictEqual(woundTarget(3, 4), 5); // F < R
    assert.strictEqual(woundTarget(5, 9), 5);
    assert.strictEqual(woundTarget(2, 4), 6); // F ≤ R/2
    assert.strictEqual(woundTarget(4, 9), 6);
  });

  test('un 1 siempre falla y el crítico siempre hiere', () => {
    assert.strictEqual(woundSucceeds(1, 2), false);
    assert.strictEqual(woundSucceeds(6, 6), true);
    assert.strictEqual(woundSucceeds(5, 6), false);
    assert.strictEqual(woundSucceeds(4, 6, 4), true); // Anti-X 4+: el 4 es crítico
  });
});

suite('combate: impactar y salvar', () => {
  test('impacta con HP o más; el 6 siempre y el 1 nunca', () => {
    assert.strictEqual(hitSucceeds(3, 3), true);
    assert.strictEqual(hitSucceeds(2, 3), false);
    assert.strictEqual(hitSucceeds(1, 2), false);
    assert.strictEqual(hitSucceeds(6, 6), true);
  });

  test('el FP empeora la armadura; la invulnerable no cambia; se usa la mejor', () => {
    assert.strictEqual(saveTarget(3, 0, null), 3);
    assert.strictEqual(saveTarget(3, -2, null), 5);
    assert.strictEqual(saveTarget(3, -3, 4), 4);  // armadura 6+, invulnerable 4+
    assert.strictEqual(saveTarget(2, 0, 4), 2);   // la armadura sigue siendo mejor
  });

  test('si la salvación queda peor que 6+, no hay salvación', () => {
    assert.strictEqual(saveTarget(5, -2, null), null);
    assert.strictEqual(saveTarget(7, 0, null), null); // Gretchin: 7+
  });

  test('un 1 siempre falla al salvar', () => {
    assert.strictEqual(saveSucceeds(1, 2), false);
    assert.strictEqual(saveSucceeds(2, 2), true);
  });
});
