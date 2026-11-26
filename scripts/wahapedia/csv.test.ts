import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupBy, parseCsv, requireColumns } from './csv.ts';

const SAMPLE = '﻿id|name|\r\n1|Warboss|\r\n2|Boyz|\r\n\r\n';

test('quita el BOM, el "|" final y los saltos de línea de Windows', () => {
  assert.deepEqual(parseCsv(SAMPLE), [
    { id: '1', name: 'Warboss' },
    { id: '2', name: 'Boyz' },
  ]);
});

test('respeta los campos vacíos del medio', () => {
  assert.deepEqual(parseCsv('a|b|c|\n1||3|\n'), [{ a: '1', b: '', c: '3' }]);
});

test('quita espacios alrededor de los valores (" 100" → "100")', () => {
  assert.deepEqual(parseCsv('cost|\n 100|\n'), [{ cost: '100' }]);
});

test('una línea con campos de más o de menos da error con el número de línea', () => {
  assert.throws(() => parseCsv('a|b|\n1|2|3|\n', 'X.csv'), /X\.csv, línea 2/);
  assert.throws(() => parseCsv('a|b|\n1|\n', 'X.csv'), /línea 2/);
});

test('requireColumns avisa de las columnas que faltan', () => {
  const rows = parseCsv(SAMPLE);
  assert.doesNotThrow(() => requireColumns(rows, ['id', 'name'], 'F.csv'));
  assert.throws(() => requireColumns(rows, ['id', 'role'], 'F.csv'), /faltan las columnas role/);
  assert.throws(() => requireColumns([], ['id'], 'F.csv'), /vacío/);
});

test('groupBy junta las filas por columna', () => {
  const groups = groupBy(parseCsv('k|v|\na|1|\nb|2|\na|3|\n'), 'k');
  assert.deepEqual(groups.get('a')?.map((r) => r.v), ['1', '3']);
  assert.equal(groups.get('b')?.length, 1);
});
