import * as assert from 'assert';
import * as path from 'path';
import { createCombatant, isDestroyed, totalWoundsLeft } from '../combat/combatant';
import { randomD6 } from '../combat/dice';
import { resolveRound } from '../combat/round';
import { resolveVolley } from '../combat/volley';
import { WeaponProfile } from '../data/types';
import { loadUnits } from '../data/units';
import { model, scripted, unit, weapon } from './combatFixtures';

// Un tirador con un arma, contra 5 soldados de R4, Sv 4+ y 1 herida
function shooter(w: Partial<WeaponProfile>, models = 1) {
  return createCombatant(
    unit({ weapons: [weapon(w)], points: [{ models: `${models} models`, points: 1 }] })
  );
}
function squad(models = 5, save = 4) {
  return createCombatant(
    unit({ models: [model({ toughness: 4, save, wounds: 1 })], points: [{ models: `${models} models`, points: 1 }] })
  );
}

suite('combate: una ráfaga', () => {
  test('impactar, herir, salvar y daño, por fases', () => {
    // 3 ataques HP 3+ · F4 vs R4 → 4+ · Sv 4+
    const dice = scripted([
      3, 2, 6, // impactos: sí, no, crítico → 2 impactos
      4, 1,    // heridas: sí, no → 1 herida
      3,       // salvación: falla
    ]);
    const result = resolveVolley(shooter({ attacks: '3' }), squad(), dice);
    assert.strictEqual(result.attacks, 3);
    assert.deepStrictEqual(result.hitRolls.map((d) => [d.value, d.success, d.critical]), [
      [3, true, false], [2, false, false], [6, true, true],
    ]);
    assert.strictEqual(result.woundTarget, 4);
    assert.deepStrictEqual(result.woundRolls.map((d) => d.success), [true, false]);
    assert.strictEqual(result.saveTarget, 4);
    assert.deepStrictEqual(result.saveRolls.map((d) => d.success), [false]);
    assert.deepStrictEqual(result.damageRolls, [1]);
    assert.strictEqual(result.modelsSlain, 1);
    assert.strictEqual(result.defender.modelsLeft, 4);
    assert.strictEqual(dice.remaining(), 0);
  });

  test('cada miniatura tira sus propios ataques si son dados', () => {
    // 2 miniaturas con D3 ataques: 6 → 3 y 1 → 1 = 4 ataques, y fallan todos
    const dice = scripted([6, 1, 1, 1, 1, 1]);
    const result = resolveVolley(shooter({ attacks: 'D3' }, 2), squad(), dice);
    assert.strictEqual(result.attacks, 4);
    assert.strictEqual(result.woundRolls.length, 0);
    assert.strictEqual(dice.remaining(), 0);
  });

  test('Torrent: no tira para impactar', () => {
    const dice = scripted([5, 5, 4, 1]); // 2 heridas; salva una (4) y falla otra (1)
    const result = resolveVolley(shooter({ attacks: '2', skill: null }), squad(), dice);
    assert.strictEqual(result.hitRolls.length, 0);
    assert.strictEqual(result.autoHits, 2);
    assert.strictEqual(result.modelsSlain, 1);
  });

  test('Sustained Hits 1: cada crítico da un impacto más', () => {
    const dice = scripted([6, 5, 4, 4, 4, 1, 1, 1]); // 2 impactos + 1 extra → 3 heridas → 3 fallos
    const result = resolveVolley(shooter({ attacks: '2', traits: ['sustained hits 1'] }), squad(), dice);
    assert.strictEqual(result.sustainedHits, 1);
    assert.strictEqual(result.woundRolls.length, 3);
    assert.strictEqual(result.modelsSlain, 3);
  });

  test('Lethal Hits: el crítico hiere sin tirar, pero se puede salvar', () => {
    const dice = scripted([
      6, 3, // crítico (hiere solo) e impacto normal
      2,    // la herida del impacto normal falla
      2,    // salvación de la herida letal: falla
    ]);
    const result = resolveVolley(shooter({ attacks: '2', traits: ['lethal hits'] }), squad(), dice);
    assert.strictEqual(result.lethalWounds, 1);
    assert.strictEqual(result.woundRolls.length, 1);
    assert.strictEqual(result.saveRolls.length, 1);
    assert.strictEqual(result.modelsSlain, 1);
  });

  test('Devastating Wounds: el crítico al herir no se salva', () => {
    const dice = scripted([
      4, 4, // 2 impactos
      6, 4, // herida crítica y herida normal
      6,    // la normal se salva
    ]);
    const result = resolveVolley(shooter({ attacks: '2', traits: ['devastating wounds'] }), squad(), dice);
    assert.strictEqual(result.unsavable, 1);
    assert.strictEqual(result.saveRolls.length, 1);
    assert.strictEqual(result.modelsSlain, 1);
  });

  test('Twin-linked: repite la herida fallada', () => {
    const dice = scripted([5, 2, 5, 1]); // impacta · falla con 2 · repite y saca 5 · no salva
    const result = resolveVolley(shooter({ traits: ['twin-linked'] }), squad(), dice);
    assert.deepStrictEqual(result.woundRolls[0], { value: 5, success: true, critical: false, rerolledFrom: 2 });
    assert.strictEqual(result.modelsSlain, 1);
  });

  test('sin salvación posible no se tira para salvar', () => {
    const dice = scripted([4, 4]); // impacta y hiere; FP -3 contra Sv 4+ → 7+
    const result = resolveVolley(shooter({ ap: -3 }), squad(), dice);
    assert.strictEqual(result.saveTarget, null);
    assert.strictEqual(result.saveRolls.length, 0);
    assert.strictEqual(result.unsavable, 1);
    assert.strictEqual(result.modelsSlain, 1);
  });

  test('deja de tirar daño cuando ya no queda nadie', () => {
    // 3 heridas sin salvar contra 1 sola miniatura: solo se tira el daño de la primera
    const dice = scripted([4, 4, 4, 4, 4, 4, 1, 1, 1, 6]);
    const result = resolveVolley(shooter({ attacks: '3', damage: 'D3' }), squad(1), dice);
    assert.deepStrictEqual(result.damageRolls, [3]);
    assert.strictEqual(result.damageDealt, 1); // 3 de daño contra 1 herida: sobran 2
    assert.ok(isDestroyed(result.defender));
    assert.strictEqual(dice.remaining(), 0);
  });
});

suite('combate: una ronda de "Abrir fuego"', () => {
  test('si eliminas al enemigo, no responde', () => {
    const dice = scripted([4, 4, 1]);
    const result = resolveRound(shooter({}), squad(1), dice);
    assert.strictEqual(result.outcome, 'enemyDestroyed');
    assert.strictEqual(result.enemyVolley, null);
    assert.strictEqual(dice.remaining(), 0);
  });

  test('si sobrevive, dispara de vuelta', () => {
    const player = squad(1); // tu unidad: 1 miniatura de Sv 4+
    const enemy = shooter({});
    const dice = scripted([
      1,       // tu disparo falla
      4, 4, 1, // el suyo impacta, hiere y no salvas
    ]);
    const result = resolveRound(player, enemy, dice);
    assert.ok(result.enemyVolley);
    assert.strictEqual(result.outcome, 'playerDestroyed');
    assert.strictEqual(result.player.modelsLeft, 0);
  });

  test('con unidades reales, un combate siempre termina', () => {
    const data = loadUnits(path.resolve(__dirname, '..', '..'));
    const find = (name: string) => data.units.find((u) => u.name === name)!;
    for (let fight = 0; fight < 50; fight += 1) {
      let player = createCombatant(find('Intercessor Squad'));
      let enemy = createCombatant(find('Boyz'));
      let rounds = 0;
      let outcome = 'continue';
      while (outcome === 'continue' && rounds < 100) {
        const result = resolveRound(player, enemy, randomD6);
        ({ player, enemy, outcome } = result);
        assert.ok(totalWoundsLeft(enemy) >= 0 && totalWoundsLeft(player) >= 0);
        rounds += 1;
      }
      assert.notStrictEqual(outcome, 'continue', 'el combate no ha terminado en 100 rondas');
    }
  });
});
