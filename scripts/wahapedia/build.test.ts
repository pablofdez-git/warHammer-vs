import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type RawTables, buildPoints, buildUnitsFile, unitKind } from './build.ts';
import { parseCsv } from './csv.ts';

// Un mini-export con la misma forma que el de Wahapedia
function tables(): RawTables {
  return {
    factions: parseCsv('id|name|link|\nORK|Orks||\nSM|Space Marines||\n'),
    datasheets: parseCsv(
      'id|name|faction_id|role|loadout|virtual|\n' +
        '1|Boyz|ORK|Battleline|<b>Every Boss Nob is equipped with:</b> 1 Choppa.<br><br><b>Every Boy is equipped with:</b> 1 Slugga; 1 Choppa.|false|\n' +
        '2|Squig|ORK|Beast||true|\n' +           // virtual: fuera
        '3|Bunker|ORK|Fortifications||false|\n' + // fortificación: fuera
        '4|Sin armas|ORK|Infantry||false|\n' +    // sin armas: fuera, con aviso
        '5|Intercessors|SM|Battleline||false|\n'  // otra facción
    ),
    models: parseCsv(
      'datasheet_id|line|name|M|T|Sv|inv_sv|W|Ld|OC|\n' +
        '1|2|Boy|6"|5|5+|-|1|7+|2|\n' +
        '1|1|Boss Nob|6"|5|5+|-|2|7+|2|\n' +
        '3|1|Bunker|-|10|3+|-|20|-|-|\n' +
        '4|1|Grot|6"|2|7+|-|1|8+|1|\n' +
        '5|1|Intercessor|6"|5|3+|-|2|6+|2|\n'
    ),
    wargear: parseCsv(
      'datasheet_id|line|line_in_wargear|name|description|range|type|A|BS_WS|S|AP|D|\n' +
        '1|2|1|Choppa||Melee|Melee|3|3|4|-1|1|\n' +
        '1|1|1|Slugga|PISTOL|12|Ranged|1|5|4|0|1|\n' +
        '1|3|1||||||||||\n' +                        // fila vacía: se ignora sin avisar
        '1|4|1|Rokkit raro||24|Ranged|X|5|9|-2|D6|\n' + // ataques no válidos: aviso
        '5|1|1|Bolt Rifle|Heavy|24|Ranged|2|3|4|-1|1|\n'
    ),
    costs: parseCsv(
      'datasheet_id|line|description|cost|\n' +
        '1|1|YOUR UNIT COSTS||\n' +
        '1|2|20 models| 170|\n' +
        '1|3|10 models|85|\n' +
        '1|4|10 models|85|\n' +
        '4|1|1 model|5|\n' +
        '5|1|5 models|85|\n'
    ),
    keywords: parseCsv(
      'datasheet_id|keyword|model|is_faction_keyword|\n' +
        '1|Orks||true|\n1|Infantry||false|\n1|Infantry|Boss Nob|false|\n' +
        '5|Infantry||false|\n'
    ),
    lastUpdate: parseCsv('last_update|\n2026-11-23 01:43:36|\n'),
  };
}

test('solo entran las facciones pedidas y las unidades jugables', () => {
  const { file } = buildUnitsFile(tables(), ['ORK']);
  assert.deepEqual(file.units.map((u) => u.name), ['Boyz']);
  assert.deepEqual(file.factions, [{ id: 'ORK', name: 'Orks' }]);
  assert.equal(file.exportedAt, '2026-11-23 01:43:36');
});

test('monta la unidad: perfiles y armas en orden, puntos sin repetir', () => {
  const boyz = buildUnitsFile(tables(), ['ORK']).file.units[0];
  assert.deepEqual(boyz.models.map((m) => m.name), ['Boss Nob', 'Boy']);
  assert.deepEqual(boyz.models[1], {
    name: 'Boy', move: 6, toughness: 5, save: 5, invuln: null, wounds: 1, leadership: 7, oc: 2,
    loadout: ['Slugga', 'Choppa'], // en el orden de las armas de la unidad
  });
  assert.deepEqual(boyz.models[0].loadout, ['Choppa']); // el Nob lleva solo lo suyo
  assert.deepEqual(boyz.weapons.map((w) => w.name), ['Slugga', 'Choppa']);
  assert.deepEqual(boyz.weapons[1], {
    name: 'Choppa', type: 'melee', range: null, attacks: '3', skill: 3, strength: 4, ap: -1, damage: '1', traits: [],
  });
  assert.deepEqual(boyz.weapons[0].traits, ['pistol']);
  assert.deepEqual(boyz.points, [
    { models: '10 models', points: 85 },
    { models: '20 models', points: 170 },
  ]);
  assert.deepEqual(boyz.keywords, ['Orks', 'Infantry']); // sin repetir
  assert.equal(boyz.kind, 'infantry');
});

test('avisa de lo descartado', () => {
  const { warnings } = buildUnitsFile(tables(), ['ORK']);
  assert.equal(warnings.length, 2);
  assert.match(warnings.join('\n'), /Rokkit raro/);
  assert.match(warnings.join('\n'), /Sin armas: descartada \(sin armas\)/);
});

test('una facción que no existe da error', () => {
  assert.throws(() => buildUnitsFile(tables(), ['NEC']), /NEC/);
});

test('si falta una columna, para antes de importar nada', () => {
  const broken = tables();
  broken.models = parseCsv('datasheet_id|line|name|\n1|1|Boy|\n');
  assert.throws(() => buildUnitsFile(broken, ['ORK']), /Datasheets_models\.csv: faltan las columnas/);
});

function costRows(lines: string[]) {
  const body = lines.map((line, i) => `1|${i + 1}|${line}|`).join('\n');
  return parseCsv(`datasheet_id|line|description|cost|\n${body}\n`);
}

test('puntos: solo el primer tramo (repetir la unidad sale más caro)', () => {
  // Boyz en 11ª edición
  const rows = costRows([
    'YOUR 1ST TO 3RD UNITS COST|', '10 models|85', '20 models|170',
    'YOUR 4TH+ UNIT COSTS|', '10 models|95', '20 models|180',
  ]);
  assert.deepEqual(buildPoints(rows), [
    { models: '10 models', points: 85 },
    { models: '20 models', points: 170 },
  ]);
});

test('puntos: las mejoras de equipo no son el precio de la unidad', () => {
  // Gladiator Lancer: antes salía "10 puntos" por el Multi-melta
  const rows = costRows([
    'YOUR 1ST TO 2ND UNITS COST|', '1 model|165',
    'YOUR 3RD+ UNIT COSTS|', '1 model|185',
    'WARGEAR OPTIONS|', 'per Multi-melta|10',
  ]);
  assert.deepEqual(buildPoints(rows), [{ models: '1 model', points: 165 }]);
});

test('puntos: títulos seguidos y repetidos cuentan como un solo tramo', () => {
  // Intercessor Squad
  const rows = costRows([
    'YOUR UNIT COSTS|', 'YOUR UNIT COSTS|', '5 models|85', '5 models|85', '10 models|170', '10 models|170',
    'YOUR UNIT COSTS|', '5 models|85', '10 models|170',
  ]);
  assert.deepEqual(buildPoints(rows).map((p) => p.points), [85, 170]);
});

test('puntos: los títulos de composición no abren tramo nuevo', () => {
  // Decimus Kill Team
  const rows = costRows([
    'YOUR UNIT COSTS|', '<div class="dsHeaderComp">1 Kill Team Sergeant</div>|', '5 models|110',
    '<div class="dsHeaderComp">2 Gravis Veteran</div>|', '10 models|210',
  ]);
  assert.deepEqual(buildPoints(rows).map((p) => p.points), [110, 210]);
});

test('unitKind: lo grande manda sobre "personaje"', () => {
  assert.equal(unitKind(['Infantry']), 'infantry');
  assert.equal(unitKind(['Infantry', 'Character']), 'character');
  assert.equal(unitKind(['Monster', 'Character']), 'monster');
  assert.equal(unitKind(['Vehicle', 'Character', 'Monster']), 'vehicle');
  assert.equal(unitKind(['Mounted']), 'infantry');
});
