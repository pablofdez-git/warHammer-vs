import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultWeapons, itemMatches, parseLoadout, weaponBaseName } from './loadout.ts';

const BOYZ =
  '<b>Every Nob is equipped with:</b> 1 Kustom Choppa; 1 Kombi-skorcha.<br><br>' +
  '<b>Every Boy is equipped with:</b> 1 Choppa; 1 Shoota; 1 Slugga.';
const BOYZ_WEAPONS = [
  'Kombi-skorcha - Shoota', 'Kombi-skorcha - Skorcha', 'Rokkit Launcha - Busta',
  'Shoota', 'Slugga', 'Choppa', 'Kustom Choppa', 'Power Klaw',
];

test('lee las secciones del loadout (Wahapedia, HTML)', () => {
  assert.deepEqual(parseLoadout(BOYZ), [
    { subject: 'nob', items: ['kustom choppa', 'kombi-skorcha'] },
    { subject: 'boy', items: ['choppa', 'shoota', 'slugga'] },
  ]);
  assert.deepEqual(parseLoadout('<b>This model is equipped with:</b> 2 soulshatter lascannons; twin heavy bolter.'), [
    { subject: 'model', items: ['soulshatter lascannons', 'twin heavy bolter'] },
  ]);
  assert.deepEqual(parseLoadout(''), []);
});

test('los modos y los plurales cuentan como la misma arma', () => {
  assert.equal(weaponBaseName('Bolt Rifle - Focused Fire'), 'bolt rifle');
  assert.ok(itemMatches('lascannon', 'Lascannon'));
  assert.ok(itemMatches('soulshatter lascannons', 'Soulshatter lascannon'));
  assert.ok(itemMatches('kombi-skorcha', 'Kombi-skorcha - Skorcha'));
  assert.ok(!itemMatches('choppa', 'Kustom Choppa'));
});

test('cada miniatura lleva lo de su sección (y no las armas especiales)', () => {
  const sections = parseLoadout(BOYZ);
  assert.deepEqual(defaultWeapons(sections, 'Boy', BOYZ_WEAPONS), ['Shoota', 'Slugga', 'Choppa']);
  assert.deepEqual(defaultWeapons(sections, 'Nob', BOYZ_WEAPONS), [
    'Kombi-skorcha - Shoota', 'Kombi-skorcha - Skorcha', 'Kustom Choppa',
  ]);
});

test('"This model" / "Every model" valen para todas las miniaturas', () => {
  const sections = parseLoadout('<b>Every model is equipped with:</b> 1 Bolt Pistol; 1 Bolt Rifle.');
  const weapons = ['Bolt Pistol', 'Bolt Rifle - Focused Fire', 'Bolt Rifle - Saturation', 'Plasma Pistol'];
  assert.deepEqual(defaultWeapons(sections, 'Intercessor Sergeant', weapons), weapons.slice(0, 3));
});

test('plural en el sujeto ("2 Havocs are equipped with")', () => {
  const sections = parseLoadout('<b>2 Havocs are equipped with:</b> lascannon.');
  assert.deepEqual(defaultWeapons(sections, 'Havoc', ['Lascannon', 'Autocannon']), ['Lascannon']);
});

test('sin loadout legible devuelve [] (el combate usará todas las armas)', () => {
  assert.deepEqual(defaultWeapons([], 'Boy', BOYZ_WEAPONS), []);
});
