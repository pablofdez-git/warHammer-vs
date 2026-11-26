import * as assert from 'assert';
import * as path from 'path';
import { loadUnits, unitsOfFaction } from '../data/units';

// out/test/ → raíz del proyecto
const ROOT = path.resolve(__dirname, '..', '..');

// Comprueba el units.json de verdad, el que se empaqueta: si una reimportación lo rompe, salta aquí
suite('units.json', () => {
  const data = loadUnits(ROOT);

  test('trae las tres facciones iniciales, todas con unidades', () => {
    assert.deepStrictEqual(data.factions.map((f) => f.id), ['SM', 'CSM', 'ORK']);
    for (const faction of data.factions) {
      assert.ok(unitsOfFaction(data, faction.id).length > 20, faction.id);
    }
  });

  test('todas las unidades se pueden usar en combate y reclutar', () => {
    for (const unit of data.units) {
      assert.ok(unit.models.length > 0, `${unit.name}: sin perfil`);
      assert.ok(unit.weapons.length > 0, `${unit.name}: sin armas`);
      assert.ok(unit.points.length > 0 && unit.points[0].points > 0, `${unit.name}: sin puntos`);
      for (const model of unit.models) {
        assert.ok(model.toughness > 0 && model.wounds > 0, `${unit.name}: perfil raro`);
        assert.ok(model.save >= 2 && model.save <= 7, `${unit.name}: Sv ${model.save}`);
      }
    }
  });

  test('una unidad conocida tiene los valores de Wahapedia', () => {
    const boyz = data.units.find((u) => u.faction === 'ORK' && u.name === 'Boyz');
    assert.ok(boyz);
    assert.strictEqual(boyz.kind, 'infantry');
    assert.strictEqual(boyz.models[0].toughness, 5);
  });
});
