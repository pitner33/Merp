const RACE_DISPLAY_NAMES: Record<string, string> = {
  dwarf: 'Dwarf',
  umli: 'Umli',
  nolda: 'Nolda',
  sinda: 'Sinda',
  woodElf: 'Wood-elf',
  halfElf: 'Half-elf',
  hobbit: 'Hobbit',
  humanBeorns: 'Beorn',
  humanBlackNumenor: 'Black Numenor',
  humanPirates: 'Pirates',
  humanDorwin: 'Dorwin',
  humanDunadan: 'Dúnadan',
  humanDun: 'Dún',
  humanEastlands: 'Eastlands',
  humanEriador: 'Eriador',
  humanGondor: 'Gondor',
  humanHarad: 'Harad',
  humanLossoth: 'Lossoth',
  humanRohir: 'Rohír',
  humanVarag: 'Varag',
  humanWoodmen: 'Woodsmen',
  wose: 'Wose',
  orc: 'Orc',
  urukHai: 'Uruk-hai',
  halfOrc: 'Half-orc',
  troll: 'Troll',
  ologHai: 'Olog-hai',
  halfTroll: 'Half-troll',
  animal: 'Animal',
  monster: 'Monster'
};

export function formatRaceDisplayName(race?: string | null): string {
  if (!race) return '';
  const trimmed = race.trim();
  if (!trimmed) return '';
  const direct = RACE_DISPLAY_NAMES[trimmed];
  if (direct) return direct;
  const spaced = trimmed
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function getRaceDisplayNameMap(): Readonly<Record<string, string>> {
  return RACE_DISPLAY_NAMES;
}
