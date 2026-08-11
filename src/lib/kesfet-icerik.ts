export type KesfetIcerikBlogu = {
  type?: string;
  props?: { sunum?: string; [key: string]: unknown };
  [key: string]: unknown;
};

export type KesfetTestBlogu = KesfetIcerikBlogu & {
  type: 'kontrol' | 'kayit';
  props: { sunum?: string; [key: string]: unknown };
};

export const kesfetBloklariniAyir = (bloklar: KesfetIcerikBlogu[]): { test: KesfetTestBlogu[]; anlatim: KesfetIcerikBlogu[] } => {
  const test = bloklar
    .filter((blok) => blok.type === 'kayit' || (blok.type === 'kontrol' && blok.props?.sunum !== 'satirici'))
    .map((blok) => ({ ...blok, type: blok.type as 'kontrol' | 'kayit', props: blok.props ?? {} }));
  const anlatim = bloklar.filter((blok) =>
    blok.type !== 'kayit' && (blok.type !== 'kontrol' || blok.props?.sunum === 'satirici'),
  );
  return { test, anlatim };
};
