import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { SeoMeta } from '../components/SeoMeta';
import { MevzuatGovde } from '../components/MevzuatGovde';
import {
  sozlukGoruntule,
  sozlukTerimYukle,
  type SozlukTerimi,
} from '../lib/sozluk';
import { HESAP_PLANI } from '../data/hesap-plani';

/** Markdown benzeri basit metni HTML'e çevirir (paragraf, **kalın**, liste). */
const metinToParagraflar = (metin: string): { tip: 'p' | 'h' | 'ul'; icerik: string | string[] }[] => {
  const sonuc: { tip: 'p' | 'h' | 'ul'; icerik: string | string[] }[] = [];
  const satirlar = metin.split('\n');
  let listeTamponu: string[] = [];

  const listeyiBosalt = () => {
    if (listeTamponu.length > 0) {
      sonuc.push({ tip: 'ul', icerik: [...listeTamponu] });
      listeTamponu = [];
    }
  };

  for (const satir of satirlar) {
    const t = satir.trim();
    if (!t) {
      listeyiBosalt();
      continue;
    }
    if (t.startsWith('- ')) {
      listeTamponu.push(t.slice(2));
      continue;
    }
    listeyiBosalt();
    if (t.startsWith('## ')) {
      sonuc.push({ tip: 'h', icerik: t.slice(3) });
    } else {
      sonuc.push({ tip: 'p', icerik: t });
    }
  }
  listeyiBosalt();
  return sonuc;
};

/** **kalın** ve `kod` syntax'ını span'lere çevirir. */
const inlineFormat = (metin: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(metin)) !== null) {
    if (match.index > lastIndex) {
      parts.push(metin.slice(lastIndex, match.index));
    }
    const seg = match[0];
    if (seg.startsWith('**')) {
      parts.push(
        <strong key={key++} className="font-bold text-ink">
          {seg.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <code
          key={key++}
          className="font-mono text-[12.5px] px-1.5 py-0.5 bg-surface-2 rounded"
        >
          {seg.slice(1, -1)}
        </code>,
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < metin.length) parts.push(metin.slice(lastIndex));
  return parts;
};

export const SozlukTerimSayfasi = () => {
  const { slug } = useParams<{ slug: string }>();
  const [terim, setTerim] = useState<SozlukTerimi | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [bulunamadi, setBulunamadi] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let iptal = false;
    setYukleniyor(true);
    setBulunamadi(false);

    sozlukTerimYukle(slug)
      .then((data) => {
        if (iptal) return;
        if (!data) {
          setBulunamadi(true);
          return;
        }
        setTerim(data);
        // Görüntüleme sayacı (best-effort, hata olursa sessiz)
        sozlukGoruntule(slug).catch(() => {});
      })
      .catch(() => {
        if (!iptal) setBulunamadi(true);
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });

    return () => {
      iptal = true;
    };
  }, [slug]);

  if (!slug) return <Navigate to="/sozluk" replace />;

  if (yukleniyor) {
    return (
      <main className="max-w-[760px] mx-auto px-5 sm:px-8 py-12">
        <div className="text-sm text-ink-quiet text-center">
          Yükleniyor…
        </div>
      </main>
    );
  }

  if (bulunamadi || !terim) {
    return (
      <>
        <SeoMeta
          title="Terim bulunamadı"
          description="Aradığınız terim sözlükte yok."
          canonical={`/sozluk/${slug}`}
          index={false}
        />
        <main className="max-w-[760px] mx-auto px-5 sm:px-8 py-16 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight mb-3">
            Terim bulunamadı
          </h1>
          <p className="text-[14px] text-ink-soft mb-6">
            "{slug}" terimi sözlükte yok ya da kaldırılmış olabilir.
          </p>
          <Link
            to="/sozluk"
            className="inline-flex items-center gap-2 bg-ink text-bg px-5 py-2.5 text-[12px] tracking-[0.2em] uppercase font-bold rounded-lg hover:opacity-90 transition"
          >
            <Icon name="ArrowLeft" size={12} />
            Sözlüğe Dön
          </Link>
        </main>
      </>
    );
  }

  const paragraflar = metinToParagraflar(terim.uzun_icerik);
  const ilgiliHesaplar = terim.ilgili_hesap_kodlari
    .map((kod) => HESAP_PLANI.find((h) => h.kod === kod))
    .filter((h): h is NonNullable<typeof h> => Boolean(h));

  return (
    <>
      <SeoMeta
        title={`${terim.baslik} Nedir? Tanımı, Örnekleri ve Muhasebe Kayıtları`}
        description={terim.kisa_aciklama.slice(0, 158)}
        canonical={`/sozluk/${terim.slug}`}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'DefinedTerm',
          name: terim.baslik,
          description: terim.kisa_aciklama,
          inLanguage: 'tr',
          inDefinedTermSet: {
            '@type': 'DefinedTermSet',
            name: 'MuhasebeAkademi Mali Sözlük',
            url: '/sozluk',
          },
        }}
      />
      <main className="max-w-[1080px] mx-auto px-5 sm:px-8 py-10">
        <nav className="text-[12px] text-ink-mute mb-6 font-medium">
          <Link to="/sozluk" className="hover:text-ink-soft transition">
            Mali Sözlük
          </Link>
          <span className="mx-2 text-ink-quiet">/</span>
          <span className="text-ink-soft">{terim.baslik}</span>
        </nav>

        <article itemScope itemType="https://schema.org/DefinedTerm">
          <header className="mb-8 pb-8 border-b border-line">
            <h1
              itemProp="name"
              className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4"
            >
              {terim.baslik}
            </h1>
            <p
              itemProp="description"
              className="text-[16px] sm:text-[17px] text-ink-soft leading-relaxed font-medium max-w-[68ch]"
            >
              {terim.kisa_aciklama}
            </p>
          </header>

          <div className="prose-content space-y-4 max-w-[70ch]">
            {paragraflar.map((p, i) => {
              if (p.tip === 'h') {
                return (
                  <h2
                    key={i}
                    className="font-display text-2xl font-bold tracking-tight pt-4 mt-2"
                  >
                    {inlineFormat(p.icerik as string)}
                  </h2>
                );
              }
              if (p.tip === 'ul') {
                return (
                  <ul
                    key={i}
                    className="list-disc pl-5 space-y-1.5 text-[14.5px] text-ink-soft leading-relaxed"
                  >
                    {(p.icerik as string[]).map((li, j) => (
                      <li key={j}>{inlineFormat(li)}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p
                  key={i}
                  className="text-[15px] text-ink-soft leading-[1.75]"
                >
                  {inlineFormat(p.icerik as string)}
                </p>
              );
            })}
          </div>

          <div className="mvz-sayfa">
            <MevzuatGovde mevzuat={terim.mevzuat} />
          </div>

          {terim.ornek && (
            <aside className="mt-8 p-5 bg-brand-soft/40 border border-brand-soft rounded-xl">
              <div className="text-[10px] tracking-[0.22em] uppercase font-mono font-bold text-brand dark:text-brand-mute mb-2">
                Örnek
              </div>
              <p className="text-[14px] text-ink-soft leading-relaxed">
                {inlineFormat(terim.ornek)}
              </p>
            </aside>
          )}

          {ilgiliHesaplar.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold tracking-tight mb-3">
                İlgili TDHP Hesapları
              </h2>
              <div className="flex flex-wrap gap-2">
                {ilgiliHesaplar.map((h) => (
                  <span
                    key={h.kod}
                    className="inline-flex items-baseline gap-2 px-3 py-1.5 bg-surface-2 border border-line rounded-lg"
                  >
                    <span className="font-mono text-[12px] font-bold text-ink tnum">
                      {h.kod}
                    </span>
                    <span className="text-[12.5px] text-ink-soft">
                      {h.ad}
                    </span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {terim.ilgili_terimler.length > 0 && (
            <section className="mt-8 pt-6 border-t border-line">
              <h2 className="font-display text-xl font-bold tracking-tight mb-3">
                İlgili Terimler
              </h2>
              <div className="flex flex-wrap gap-2">
                {terim.ilgili_terimler.map((s) => (
                  <Link
                    key={s}
                    to={`/sozluk/${s}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium border border-line-strong rounded-lg hover:border-ink hover:bg-bg-tint transition"
                  >
                    {s.replace(/-/g, ' ')}
                    <Icon name="ArrowRight" size={11} />
                  </Link>
                ))}
              </div>
            </section>
          )}

          <aside className="mt-10 p-5 bg-ink text-bg rounded-xl">
            <div className="font-display text-lg font-bold mb-1.5">
              Bu konuyu pratikle pekiştir
            </div>
            <p className="text-[13.5px] opacity-90 leading-relaxed mb-3">
              MuhasebeAkademi'da "{terim.baslik}" konusuyla ilgili soruları
              gerçeğe yakın belgelerle çöz, anında geri bildirim al.
            </p>
            <Link
              to="/problemler"
              className="inline-flex items-center gap-2 bg-surface/10 hover:bg-surface/20 dark:bg-black/10 dark:hover:bg-black/20 px-4 py-2 text-[11px] tracking-[0.2em] uppercase font-bold rounded-lg transition"
            >
              <Icon name="ArrowRight" size={12} />
              Soruları Çöz
            </Link>
          </aside>
        </article>
      </main>
    </>
  );
};
