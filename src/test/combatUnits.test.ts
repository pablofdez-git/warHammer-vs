import * as assert from 'assert';
import {
  applyDamage,
  createCombatant,
  isDestroyed,
  mainProfile,
  modelCount,
  totalWounds,
  totalWoundsLeft,
} from '../combat/combatant';
import { conditionApplies, weaponRules } from '../combat/traits';
import { carriedWeapons, expectedDamage, pickWeapon } from '../combat/weaponChoice';
import { WeaponProfile } from '../data/types';
import { model, unit, weapon } from './combatFixtures';

suite('combate: unidades', () => {
  const boyz = unit({
    models: [model({ name: 'Boy', wounds: 1 }), model({ name: 'Nob', wounds: 3 })],
    points: [{ models: '10 models', points: 85 }],
  });

  test('perfil de la tropa básica y tamaño mínimo', () => {
    assert.strictEqual(mainProfile(boyz).name, 'Boy');
    assert.strictEqual(modelCount(boyz), 10);
    assert.strictEqual(modelCount(unit()), 1);
  });

  test('el daño que sobra al matar una miniatura se pierde', () => {
    const c = createCombatant(boyz);
    const { combatant, dealt, slain } = applyDamage(c, 6); // un láser contra un Boy
    assert.strictEqual(dealt, 1);
    assert.strictEqual(slain, true);
    assert.strictEqual(combatant.modelsLeft, 9);
    assert.strictEqual(c.modelsLeft, 10); // el original no cambia
  });

  test('las heridas se acumulan en la misma miniatura', () => {
    let c = createCombatant(unit({ models: [model({ wounds: 3 })], points: [{ models: '2 models', points: 1 }] }));
    assert.strictEqual(totalWounds(c), 6);
    c = applyDamage(c, 2).combatant;
    assert.strictEqual(c.modelsLeft, 2);
    assert.strictEqual(totalWoundsLeft(c), 4);
    c = applyDamage(c, 2).combatant; // mata a la primera; el punto que sobra se pierde
    assert.strictEqual(c.modelsLeft, 1);
    assert.strictEqual(totalWoundsLeft(c), 3);
    c = applyDamage(c, 5).combatant;
    assert.ok(isDestroyed(c));
    assert.strictEqual(totalWoundsLeft(c), 0);
    assert.strictEqual(applyDamage(c, 1).dealt, 0);
  });
});

suite('combate: reglas de arma', () => {
  const infantry = ['Orks', 'Infantry'];
  const vehicle = ['Orks', 'Vehicle'];

  test('condiciones con y sin "non-"', () => {
    assert.strictEqual(conditionApplies('non-monster/vehicle', infantry), true);
    assert.strictEqual(conditionApplies('non-monster/vehicle', vehicle), false);
    assert.strictEqual(conditionApplies('monster/vehicle', vehicle), true);
    assert.strictEqual(conditionApplies('infantry', ['INFANTRY']), true); // sin mayúsculas
  });

  test('lee las reglas que se usan en el Auspex', () => {
    const rules = weaponRules(
      weapon({ traits: ['sustained hits 2', 'lethal hits', 'devastating wounds', 'twin-linked', 'rapid fire 1'] }),
      infantry
    );
    assert.deepStrictEqual(rules, {
      autoHit: false, sustainedHits: '2', lethalHits: true,
      devastatingWounds: true, criticalWoundOn: 6, rerollWounds: true,
    });
  });

  test('Torrent o HP "-" impactan solos', () => {
    assert.strictEqual(weaponRules(weapon({ traits: ['torrent'] }), infantry).autoHit, true);
    assert.strictEqual(weaponRules(weapon({ skill: null }), infantry).autoHit, true);
  });

  test('las reglas con condición solo valen contra ese objetivo', () => {
    const shoota = weapon({ traits: ['lethal hits: non-monster/vehicle'] });
    assert.strictEqual(weaponRules(shoota, infantry).lethalHits, true);
    assert.strictEqual(weaponRules(shoota, vehicle).lethalHits, false);
  });

  test('Anti-X N+ adelanta el crítico al herir, solo contra X', () => {
    const anti = weapon({ traits: ['anti-vehicle 2+', 'anti-infantry 4+'] });
    assert.strictEqual(weaponRules(anti, vehicle).criticalWoundOn, 2);
    assert.strictEqual(weaponRules(anti, infantry).criticalWoundOn, 4);
    assert.strictEqual(weaponRules(anti, ['Monster']).criticalWoundOn, 6);
  });

  test('Sustained Hits D3', () => {
    assert.strictEqual(weaponRules(weapon({ traits: ['sustained hits d3'] }), infantry).sustainedHits, 'D3');
  });
});

suite('combate: elegir arma', () => {
  const target = createCombatant(unit({ models: [model({ toughness: 5, save: 3, wounds: 2 })] }));

  test('el daño esperado tiene en cuenta F, FP y heridas del objetivo', () => {
    const bolter = weapon({ attacks: '2', skill: 3, strength: 4, ap: 0, damage: '1' });
    // 2 ataques × 4/6 impactar × 2/6 herir (F4 vs R5 → 5+) × 2/6 no salvar (3+) × 1 daño
    assert.ok(Math.abs(expectedDamage(bolter, target) - 2 * (4 / 6) * (2 / 6) * (2 / 6)) < 1e-9);
    // El daño de un arma no pasa de las heridas de una miniatura (D6 contra 2 heridas → 2)
    const lascannon = weapon({ attacks: '1', strength: 12, ap: -3, damage: 'D6+1' });
    // F12 vs R5 → 2+ · Sv 3+ con FP -3 → 6+ (no salva 5/6) · D6+1 limitado a 2 heridas
    assert.ok(Math.abs(expectedDamage(lascannon, target) - (4 / 6) * (5 / 6) * (5 / 6) * 2) < 1e-9);
  });

  test('prefiere armas a distancia; sin ellas, cuerpo a cuerpo', () => {
    const pistol = weapon({ name: 'Pistola', attacks: '1' });
    const fist = weapon({ name: 'Puño', type: 'melee', range: null, attacks: '6', strength: 12 });
    const armed = (weapons: WeaponProfile[]) => createCombatant(unit({ weapons }));
    assert.strictEqual(pickWeapon(armed([fist, pistol]), target).name, 'Pistola');
    assert.strictEqual(pickWeapon(armed([fist]), target).name, 'Puño');
  });

  test('elige la mejor contra ese objetivo', () => {
    const many = weapon({ name: 'Muchos disparos', attacks: '4', strength: 4, ap: 0 });
    const strong = weapon({ name: 'Antitanque', attacks: '1', strength: 14, ap: -4, damage: 'D6' });
    const horde = createCombatant(unit({ models: [model({ toughness: 3, save: 6, wounds: 1 })] }));
    const tank = createCombatant(unit({ models: [model({ toughness: 11, save: 2, wounds: 13 })] }));
    const attacker = createCombatant(unit({ weapons: [many, strong] }));
    assert.strictEqual(pickWeapon(attacker, horde).name, 'Muchos disparos');
    assert.strictEqual(pickWeapon(attacker, tank).name, 'Antitanque');
  });

  test('solo usa las armas que lleva por defecto, no las opcionales', () => {
    const shoota = weapon({ name: 'Shoota', attacks: '2', strength: 4 });
    const rokkit = weapon({ name: 'Rokkit Launcha - Busta', strength: 10, ap: -2, damage: '3' });
    const boy = model({ name: 'Boy', loadout: ['Shoota'] });
    const boyz = createCombatant(unit({ models: [boy], weapons: [shoota, rokkit] }));
    const tank = createCombatant(unit({ models: [model({ toughness: 11, save: 2, wounds: 13 })] }));
    assert.deepStrictEqual(carriedWeapons(boyz).map((w) => w.name), ['Shoota']);
    assert.strictEqual(pickWeapon(boyz, tank).name, 'Shoota'); // aunque el Rokkit fuera mejor
  });

  test('si el loadout no se pudo leer, puede usar todas', () => {
    const a = weapon({ name: 'A' });
    const b = weapon({ name: 'B' });
    const c = createCombatant(unit({ weapons: [a, b] })); // loadout: []
    assert.strictEqual(carriedWeapons(c).length, 2);
  });
});
