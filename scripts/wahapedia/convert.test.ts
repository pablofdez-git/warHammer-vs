import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseAp, parseDice, parseRange, parseStat, parseTraits, requireStat } from './convert.ts';

test('parseStat entiende los formatos de Wahapedia', () => {
  assert.equal(parseStat('6"'), 6);
  assert.equal(parseStat('3+'), 3);
  assert.equal(parseStat('4*'), 4);
  assert.equal(parseStat('20+"'), 20);
  assert.equal(parseStat('12'), 12);
});

test('parseStat devuelve null cuando no hay valor', () => {
  for (const empty of ['', '-', 'N/A', '  ']) {
    assert.equal(parseStat(empty), null);
  }
});

test('requireStat da error si falta una característica obligatoria', () => {
  assert.equal(requireStat('5', 'R'), 5);
  assert.throws(() => requireStat('-', 'Boyz: R'), /Boyz: R/);
});

test('parseAp: negativo, cero o sin FP', () => {
  assert.equal(parseAp('-2'), -2);
  assert.equal(parseAp('0'), 0);
  assert.equal(parseAp('-'), 0);
});

test('parseRange: cuerpo a cuerpo no tiene alcance', () => {
  assert.equal(parseRange('Melee'), null);
  assert.equal(parseRange('24'), 24);
  assert.equal(parseRange('24"'), 24);
});

test('parseDice acepta números y dados', () => {
  for (const ok of ['1', '12', 'D3', 'D6', '2D6', 'D6+1', 'D3+3', '2D6+3', '3D6']) {
    assert.equal(parseDice(ok), ok);
  }
  assert.equal(parseDice(' d6 + 1 '), 'D6+1'); // normaliza mayúsculas y espacios
});

test('parseDice rechaza lo que no es una tirada', () => {
  for (const bad of ['', '-', 'D4', 'D6-1', 'x', '2+']) {
    assert.equal(parseDice(bad), null);
  }
});

test('parseTraits separa y pasa a minúsculas', () => {
  assert.deepEqual(parseTraits('ASSAULT, Rapid Fire 1'), ['assault', 'rapid fire 1']);
  assert.deepEqual(parseTraits(''), []);
});
