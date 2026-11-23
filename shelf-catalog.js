(() => {
  'use strict';
  // Model dimensions use meters. The source of each profile is listed in ASSET_CREDITS.md.
  const SHELF_WIDTH = .646;
  const ROWS_PER_SHELF = 4;
  const GAP = .009;
  const format = (type, width, height, depth, color, region = 'NA') => ({
    type, width, height, depth, color, region, edition: 'original',
  });
  const profiles = {
    'Game Boy': format('cardboard', .126, .127, .025, '#9b8b78'),
    'Game Boy Color': format('cardboard', .126, .127, .025, '#736082'),
    GBA: format('cardboard', .126, .127, .026, '#716886'),
    NES: format('cardboard', .128, .178, .022, '#53514d'),
    SNES: format('cardboard', .178, .127, .030, '#655760'),
    N64: format('cardboard', .178, .126, .032, '#5d6554'),
    PS1: format('jewel', .142, .125, .010, '#363737'),
    PS2: format('keep', .135, .190, .014, '#363536'),
    GameCube: format('keep', .135, .190, .014, '#332d40'),
    Wii: format('keep', .135, .190, .014, '#e3dfd4'),
    'PC & DOS': format('big-box', .187, .226, .040, '#6e4835'),
  };
  const referenceCard = format('catalog-card', .112, .164, .005, '#655a45', null);
  referenceCard.edition = 'Collection reference';
  const overrides = {
    mgs: { depth: .024 },
    cnc: { depth: .024 },
    ddr: { region: 'JP' },
    portal: { ...profiles.PS2, edition: '2008 standalone retail' },
    rhythm: { width: .135, height: .083, depth: .023, region: 'JP' },
    rct: { ...profiles['PC & DOS'], edition: 'Original Windows release' },
  };
  const systemOrder = [
    'Game Boy', 'SNES', 'N64', 'PS1', 'PS2', 'PC & DOS', 'GameCube', 'GBA', 'Wii', 'NES', 'Game Boy Color', 'Android',
  ];

  function shelfSystem(game) {
    const primary = game.platform.split(' / ')[0].trim();
    if (game.id === 'rct' || /^(DOS|PC)$/.test(primary)) return 'PC & DOS';
    return primary.startsWith('Android') ? 'Android' : primary;
  }

  function packageFor(game) {
    return { ...(profiles[shelfSystem(game)] || referenceCard), ...overrides[game.id], ...game.packaging };
  }

  function rowItems(games) {
    return games.map((game, index) => {
      const packaging = packageFor(game);
      const yaw = index === 0 ? -.055 : index === games.length - 1 ? .17 : 1.405 + (index % 4) * .038;
      const span = Math.cos(yaw) * packaging.width + Math.abs(Math.sin(yaw)) * packaging.depth;
      return { game, packaging, yaw, span };
    });
  }

  function rowWidth(items) {
    return items.reduce((total, item) => total + item.span, 0) + Math.max(0, items.length - 1) * GAP;
  }

  function placeRow(games, slot = 0) {
    const items = rowItems(games);
    const spare = SHELF_WIDTH - rowWidth(items);
    const gap = GAP + Math.min(.031, spare * .36 / Math.max(1, items.length - 1));
    const width = rowWidth(items) + (gap - GAP) * Math.max(0, items.length - 1);
    let left = -SHELF_WIDTH / 2 + (SHELF_WIDTH - width) * (slot % 2 ? .77 : .23);
    return items.map(item => {
      const right = left + item.span;
      const result = { ...item, x: (left + right) / 2, left, right };
      left = right + gap;
      return result;
    });
  }

  function organizeShelves(games) {
    const grouped = Map.groupBy
      ? Map.groupBy(games, shelfSystem)
      : games.reduce((groups, game) => {
        const system = shelfSystem(game);
        if (!groups.has(system)) groups.set(system, []);
        groups.get(system).push(game);
        return groups;
      }, new Map());
    const rank = system => (systemOrder.indexOf(system) + 1 || Infinity);
    const systems = [...grouped.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
    const rows = [];
    for (const platform of systems) {
      const list = grouped.get(platform);
      let row = { platform, games: [], continuation: false, total: list.length };
      for (const game of list) {
        if (row.games.length && rowWidth(rowItems([...row.games, game])) > SHELF_WIDTH) {
          rows.push(row);
          row = { ...row, games: [], continuation: true };
        }
        row.games.push(game);
      }
      rows.push(row);
    }
    return rows;
  }

  const normalizeName = value => value.normalize('NFKD').replace(/\p{Mark}/gu, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  function editDistance(a, b) {
    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    let earlier = previous;
    for (let i = 1; i <= a.length; i++) {
      const row = [i];
      for (let j = 1; j <= b.length; j++) {
        row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + Number(a[i - 1] !== b[j - 1]));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          row[j] = Math.min(row[j], earlier[j - 2] + 1);
        }
      }
      earlier = previous;
      previous = row;
    }
    return previous[b.length];
  }

  const platformAliases = {
    NES: ['Nintendo Entertainment System'],
    SNES: ['Super Nintendo', 'Super Nintendo Entertainment System'],
    N64: ['Nintendo 64'],
    PS1: ['PlayStation', 'PlayStation 1', 'PSX'],
    PS2: ['PlayStation 2'],
    GBA: ['Game Boy Advance'],
    'PC & DOS': ['Windows'],
  };

  function platformNames(game) {
    const system = shelfSystem(game);
    return [game.platform, system, ...(platformAliases[system] || [])].map(normalizeName);
  }

  function findShelfGames(games, query) {
    const q = normalizeName(query);
    if (!q) return [];
    const titles = games.map(game => ({ game, title: normalizeName(game.title) }));
    const partial = titles.filter(({ title }) => title.includes(q));
    if (partial.length) return partial.sort((a, b) => Number(b.title === q) - Number(a.title === q)).map(({ game }) => game);
    const platforms = games.map(game => ({ game, names: platformNames(game) }));
    const compact = value => value.replaceAll(' ', '');
    const exact = platforms.filter(({ names }) => names.some(name => compact(name) === compact(q)));
    if (exact.length) return exact.map(({ game }) => game);
    const systemMatches = platforms.filter(({ names }) => names.some(name => name.includes(q)));
    if (systemMatches.length) return systemMatches.map(({ game }) => game);
    if (q.length < 4) return [];
    const words = q.split(' ');
    const fuzzyTitles = titles.filter(({ title }) => words.every(word => title.split(' ').some(candidate =>
      word.length < 4 ? candidate === word : editDistance(word, candidate) <= (word.length >= 7 ? 2 : 1),
    ))).map(({ game }) => game);
    if (fuzzyTitles.length) return fuzzyTitles;
    return platforms.filter(({ names }) => names.some(name => editDistance(compact(q), compact(name)) <= 1))
      .map(({ game }) => game);
  }

  globalThis.PlayableShelfCatalog = {
    ROWS_PER_SHELF, SHELF_WIDTH, findShelfGames, organizeShelves, packageFor, placeRow, shelfSystem,
  };
})();
