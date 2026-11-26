import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { EMPTY_STATS } from '../core/state';
import { Snapshot, readSnapshot, resolveSyncFile, writeSnapshot } from '../core/syncFile';

const SNAPSHOT: Snapshot = {
  version: 1,
  savedAt: 1234,
  state: {
    requisition: 42,
    updatedAt: 1234,
    stats: { ...EMPTY_STATS, rpEarned: 50 },
  },
};

suite('archivo de sincronización', () => {
  let dir: string;

  setup(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'warhammer-companion-'));
  });

  teardown(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  test('si no existe, devuelve undefined', async () => {
    assert.strictEqual(await readSnapshot(path.join(dir, 'partida.json')), undefined);
  });

  test('escribe (creando la carpeta) y vuelve a leer lo mismo', async () => {
    const file = path.join(dir, 'sub', 'partida.json');
    await writeSnapshot(file, SNAPSHOT);

    assert.deepStrictEqual(await readSnapshot(file), SNAPSHOT);
    // No queda el temporal
    assert.deepStrictEqual(await fs.readdir(path.dirname(file)), ['partida.json']);
  });

  test('un archivo que no es JSON da error en vez de undefined', async () => {
    const file = path.join(dir, 'partida.json');
    await fs.writeFile(file, 'esto no es json', 'utf8');
    await assert.rejects(readSnapshot(file));
  });

  test('un JSON con otro formato da error (por ejemplo, una partida de pokemon-companion)', async () => {
    const file = path.join(dir, 'partida.json');
    await fs.writeFile(file, JSON.stringify({ savedAt: 1, state: { coins: 5 } }), 'utf8');
    await assert.rejects(readSnapshot(file), /formato esperado/);
  });

  test('resolveSyncFile usa la carpeta configurada o la de OneDrive', () => {
    assert.strictEqual(resolveSyncFile(`  ${dir}  `), path.join(dir, 'partida.json'));

    const original = process.env['OneDrive'];
    try {
      process.env['OneDrive'] = dir;
      assert.strictEqual(
        resolveSyncFile(''),
        path.join(dir, 'WarhammerCompanion', 'partida.json')
      );
      delete process.env['OneDrive'];
      assert.strictEqual(resolveSyncFile(''), undefined);
    } finally {
      if (original === undefined) {
        delete process.env['OneDrive'];
      } else {
        process.env['OneDrive'] = original;
      }
    }
  });
});
