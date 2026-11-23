import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../shelf-catalog.js';

const { packageFor, organizeShelves, placeRow, findShelfGames, SHELF_WIDTH } = globalThis.PlayableShelfCatalog;

const game = (id, title, platform) => ({ id, title, platform, year: 1998 });

test('original retail formats and individual exceptions have distinct dimensions', () => {
  assert.equal(packageFor(game('pk', 'Pokémon Red', 'Game Boy')).type, 'cardboard');
  const snes = packageFor(game('sm', 'Super Metroid', 'SNES'));
  assert.ok(snes.width > snes.height);
  assert.equal(packageFor(game('mgs', 'Metal Gear Solid', 'PS1')).depth, .024);
  assert.equal(packageFor(game('rhythm', 'Rhythm Tengoku', 'GBA')).region, 'JP');
  assert.equal(packageFor(game('rct', 'RollerCoaster Tycoon', 'Android Classic')).type, 'big-box');
  assert.equal(packageFor(game('papers', 'Papers, Please', 'Android')).type, 'catalog-card');
});

test('overflow uses physical capacity, preserves every title and keeps its platform grouped', () => {
  const list = Array.from({length: 32}, (_, i) => game(String(i), 'Game ' + i, 'PS1'));
  const rows = organizeShelves(list);
  assert.ok(rows.length > 1);
  assert.ok(rows[1].continuation);
  assert.deepEqual(rows.flatMap(row => row.games), list);
  for (const row of rows) {
    let previousRight = -SHELF_WIDTH / 2;
    for (const item of placeRow(row.games)) {
      assert.ok(item.left >= previousRight - 1e-8);
      assert.ok(item.right <= SHELF_WIDTH / 2 + 1e-8);
      previousRight = item.right;
    }
  }
});

test('matching handles accents, typos, multiple titles, platforms, and empty terms', () => {
  const games = [
    game('1', 'Pokémon Red / Blue', 'Game Boy'),
    game('2', 'The Legend of Zelda: Ocarina of Time', 'N64'),
    game('3', "The Legend of Zelda: Majora's Mask", 'N64'),
    game('4', 'GoldenEye 007', 'N64'),
    game('5', 'Chrono Trigger', 'SNES'),
  ];
  assert.deepEqual(findShelfGames(games, 'pokemon').map(g => g.id), ['1']);
  assert.deepEqual(findShelfGames(games, 'pokmon').map(g => g.id), ['1']);
  assert.deepEqual(findShelfGames(games, 'zelda').map(g => g.id), ['2', '3']);
  assert.deepEqual(findShelfGames(games, 'n64').map(g => g.id), ['2', '3', '4']);
  assert.deepEqual(findShelfGames(games, 'nintendo 64').map(g => g.id), ['2','3','4']);
  assert.deepEqual(findShelfGames(games, 'gameboy').map(g => g.id), ['1']);
  assert.deepEqual(findShelfGames(games, 'smes').map(g => g.id), ['5']);
  assert.deepEqual(findShelfGames(games, 'halo'), []);
  assert.deepEqual(findShelfGames(games, '???'), []);
});
