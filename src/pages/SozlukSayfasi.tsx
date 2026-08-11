import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { SeoMeta } from '../components/SeoMeta';
import { sozlukListesi, type SozlukTerimOzet } from '../lib/sozluk';

const HARFLER = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'.split('');

/** Türkçe alfabetik gruplandırma için ilk harfi al. */
const grupHarfi = (baslik: string): string => {
  const c = baslik.trim().charAt(0).toUpperCase();
  return HARFLER.includes(c) ? c : '#';
};

export const SozlukSayfasi = () => {
  const [terimler, setTerimler] = useState<SozlukTerimOzet[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [arama, setArama] = useState('');

  useEffect(() => {
    let iptal = false;
    sozlukListesi()
      .then((data) => {
        if (!iptal) setTerimler(data);
      })
      .catch((e) => {
        if (!iptal) setHata(`Yüklenemedi: ${(e as Error).message}`);
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, []);

  const filtrelenmis = useMemo(() => {
    const a = arama.trim().toLowerCase();
    if (!a) return terimler;
    return terimler.filter(
      (t) =>
        t.baslik.toLowerCase().includes(a) ||
        t.kisa_aciklama.toLowerCase().includes(a),
    );
  }, [terimler, arama]);

  const gruplu = useMemo(() => {
    const harita = new Map<string, SozlukTerimOzet[]>();
    for (const t of filtrelenmis) {
      const h = grupHarfi(t.baslik);
      if (!harita.has(h)) harita.set(h, []);
      harita.get(h)!.push(t);
    }
    return Array.from(harita.entries()).sort(([a], [b]) =>
      a.localeCompare(b, 'tr'),
    );
  }, [filtrelenmis]);

  return (
    <>
      <SeoMeta
        title="Mali Sözlük — Muhasebe ve Vergi Terimleri"
        description="Amortisman, KDV, yevmiye kaydı, bilanço ve daha fazlası. Türkçe muhasebe terimlerinin açıklamalı sözlüğü, örneklerle."
        canonical="/sozluk"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'DefinedTermSet',
          name: 'MuhasebeAkademi Mali Sözlük',
          description:
            'Türkçe muhasebe ve vergi terimlerinin açıklamalı sözlüğü.',
          inLanguage: 'tr',
        }}
      />
      <main className="max-w-[920px] mx-auto px-5 sm:px-8 py-10">
        <header className="mb-8">
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-3">
            Mali Sözlük
          </h1>
          <p className="text-[14.5px] text-ink-soft leading-relaxed max-w-2xl">
            Muhasebe ve vergi terimlerini örnekler ve ilgili TDHP hesap kodlarıyla açıklar.
            Yevmiye kaydı, KDV ve amortisman gibi konuları buradan arayabilirsin.
          </p>
        </header>

        <div className="sticky top-[56px] z-10 -mx-5 sm:-mx-8 px-5 sm:px-8 py-3 bg-bg/85 backdrop-blur-md border-b border-line mb-8">
          <div className="relative">
            <Icon
              name="Search"
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-quiet"
            />
            <input
              type="text"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Terim ara: amortisman, KDV, yevmiye"
              className="w-full pl-9 pr-3 py-2.5 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink focus:ring-2 focus:ring-blue-500/15"
            />
          </div>
        </div>

        {hata && (
          <div className="p-4 bg-danger-soft border border-danger-soft rounded-lg text-[13px] text-danger font-medium">
            {hata}
          </div>
        )}

        {yukleniyor ? (
          <div className="text-sm text-ink-quiet text-center py-12">
            Yükleniyor…
          </div>
        ) : filtrelenmis.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-ink-mute font-medium">
              "{arama}" için sonuç bulunamadı.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {gruplu.map(([harf, list]) => (
              <section key={harf}>
                <h2 className="font-display text-2xl font-bold tracking-tight mb-3 text-ink flex items-baseline gap-3">
                  <span>{harf}</span>
                  <span className="font-mono text-[10px] tracking-wider uppercase text-ink-quiet">
                    {list.length} terim
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {list.map((t) => (
                    <Link
                      key={t.slug}
                      to={`/sozluk/${t.slug}`}
                      className="block p-4 border border-line hover:border-ink rounded-xl transition group"
                    >
                      <div className="font-bold text-[14.5px] text-ink mb-1 group-hover:underline">
                        {t.baslik}
                      </div>
                      <div className="text-[12.5px] text-ink-soft leading-snug line-clamp-2">
                        {t.kisa_aciklama}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
};
