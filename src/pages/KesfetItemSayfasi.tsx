import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { IcerikGoruntuleyici } from '../components/IcerikGoruntuleyici';
import { KesfetTestModal } from '../components/KesfetTestModal';
import { IsletmeGuncelDurum, IsletmeMaliTablolar } from '../components/IsletmeDurum';
import { itemBul, kartBul, kartErisimi, kartItemlari, olcumTamamlandiMi, trackAyar, type KesfetKart } from '../data/kesfet';
import { kesfetMevzuatBaglantilariniYukle, kesfetOlcumDurumuYukle, tumKartlariYukle, type KesfetMevzuatBaglantisi } from '../lib/kesfet';
import { useKesfetIlerleme } from '../lib/use-kesfet-ilerleme';
import { useAuth } from '../contexts/AuthContext';
import { authDonusYaz } from '../lib/auth-donus';
import { kesfetBloklariniAyir, type KesfetIcerikBlogu } from '../lib/kesfet-icerik';

/**
 * Keşfet item ekranı — editorial/ledger dili. Sol TOC + okuma sütunu + İleri.
 * Mobilde TOC açılır panel. İSKELET — içerik alanı placeholder.
 */

export const KesfetItemSayfasi = () => {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const ayar = trackAyar(pathname);
  const { kart: slug, item: itemId } = useParams();
  const [kartlar, setKartlar] = useState<KesfetKart[] | null>(null);
  const { tamamlanan, tamamla } = useKesfetIlerleme();
  const { user, yukleniyor } = useAuth();
  const [tocAcik, setTocAcik] = useState(false);
  const [testAcik, setTestAcik] = useState(false);
  const [cozulenOlcumler, setCozulenOlcumler] = useState<Set<string>>(new Set());
  const [mevzuatBaglari, setMevzuatBaglari] = useState<KesfetMevzuatBaglantisi[]>([]);
  // Bölüm katlama durumu — kayıt yoksa açık (varsayılan: hepsi açık).
  const [kapaliBolumler, setKapaliBolumler] = useState<Set<string>>(new Set());
  const bolumToggle = (id: string) =>
    setKapaliBolumler((s) => {
      const yeni = new Set(s);
      if (yeni.has(id)) yeni.delete(id);
      else yeni.add(id);
      return yeni;
    });

  useEffect(() => {
    tumKartlariYukle(ayar.tip).then(setKartlar).catch(() => setKartlar([]));
  }, [ayar.tip]);
  useEffect(() => {
    window.scrollTo(0, 0);
    setTocAcik(false);
    setTestAcik(false);
  }, [itemId]);

  useEffect(() => {
    if (!user || !kartlar) return;
    const aktifKart = kartBul(kartlar, slug);
    const aktifItem = aktifKart ? itemBul(aktifKart, itemId)?.item : null;
    const soruIdleri = aktifItem?.sorular?.map((soru) => soru.soru_id) ?? [];
    const yenile = () => {
      void kesfetOlcumDurumuYukle(user.id, soruIdleri).then(setCozulenOlcumler).catch(() => setCozulenOlcumler(new Set()));
    };
    yenile();
    window.addEventListener('focus', yenile);
    return () => window.removeEventListener('focus', yenile);
  }, [user, kartlar, slug, itemId]);

  useEffect(() => {
    if (!kartlar) return;
    const aktifKart = kartBul(kartlar, slug);
    const aktifItem = aktifKart ? itemBul(aktifKart, itemId)?.item : null;
    const soruIdleri = aktifItem?.sorular?.map((soru) => soru.soru_id) ?? [];
    void kesfetMevzuatBaglantilariniYukle(soruIdleri).then(setMevzuatBaglari).catch(() => setMevzuatBaglari([]));
  }, [kartlar, slug, itemId]);

  // Yükleniyor — layout'a oturan skeleton
  if (!kartlar) {
    return (
      <div className="w-full py-8 sm:py-12 pl-4 sm:pl-6 pr-5 sm:pr-10">
        <div className="h-3 w-44 bg-surface-2 rounded animate-pulse mb-8" />
        <div className="grid lg:grid-cols-[264px_minmax(0,1fr)] gap-8 lg:gap-14">
          <div className="hidden lg:flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 bg-surface-2 rounded animate-pulse" />
            ))}
          </div>
          <div className="max-w-[1100px] w-full">
            <div className="h-4 w-24 bg-surface-2 rounded animate-pulse mb-4" />
            <div className="h-9 w-3/4 bg-surface-2 rounded animate-pulse mb-8" />
            <div className="h-48 bg-surface-2 rounded-[18px] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const kart = kartBul(kartlar, slug);
  if (!kart) {
    return (
      <main className="max-w-[1100px] mx-auto px-5 py-20 text-center">
        <p className="text-ink-soft">Bu kart bulunamadı.</p>
        <button onClick={() => nav(ayar.taban)} className="mt-4 text-brand-deep font-semibold text-sm">
          {ayar.etiket}'e dön
        </button>
      </main>
    );
  }

  if (kartErisimi(kart, kartlar, tamamlanan).durum !== 'acik') {
    return (
      <main className="max-w-[760px] mx-auto px-5 py-20 text-center">
        <Icon name="Lock" size={28} className="text-ink-mute mx-auto" />
        <p className="font-display text-xl font-bold text-ink mt-4">Bu içerik için ön koşullar tamamlanmalı.</p>
        <button onClick={() => nav(ayar.taban)} className="btn btn-soft mt-6">Keşfet'e dön</button>
      </main>
    );
  }

  const hepsi = kartItemlari(kart);
  const mevcut = itemBul(kart, itemId);

  if (!mevcut) {
    return (
      <main className="max-w-[1100px] mx-auto px-5 py-20 text-center">
        <p className="text-ink-soft">Bu içerik bulunamadı.</p>
        <button
          onClick={() => nav(`${ayar.taban}/${kart.slug}`)}
          className="mt-4 text-brand-deep font-semibold text-sm"
        >
          Karta dön
        </button>
      </main>
    );
  }

  const onceki = mevcut.sira > 0 ? hepsi[mevcut.sira - 1] : null;
  const sonraki = mevcut.sira < hepsi.length - 1 ? hepsi[mevcut.sira + 1] : null;
  const bitti = tamamlanan.has(mevcut.item.id);
  const ders = mevcut.item.tip === 'ders';
  // İşletme track: canlı defter paneli + Mali Tablolar adımında tam tablolar.
  const isIsletme = ayar.tip === 'isletme';
  const maliTablolarAdimi =
    isIsletme && mevcut.bolum.ad.toLocaleLowerCase('tr').includes('mali tablo');
  // İçeriği ikiye ayır: düz anlatım (viewer) + interaktif sorular (test modalı).
  const tumBloklar: KesfetIcerikBlogu[] = Array.isArray(mevcut.item.icerik) ? mevcut.item.icerik as KesfetIcerikBlogu[] : [];
  const { test: testSorulari, anlatim: proseBloklar } = kesfetBloklariniAyir(tumBloklar);
  const icerikVar = proseBloklar.length > 0;
  const testVar = testSorulari.length > 0;
  const olcumSorulari = mevcut.item.sorular ?? [];
  const zorunluOlcumler = olcumSorulari.filter((soru) => soru.zorunlu);
  const olcumTamam = olcumTamamlandiMi(olcumSorulari, cozulenOlcumler);
  const yayinlanabilir = tumBloklar.length > 0;

  const tamamlaVeIlerle = () => {
    if (!yayinlanabilir || !olcumTamam) return;
    void tamamla(mevcut.item.id);
    if (sonraki) nav(`${ayar.taban}/${kart.slug}/${sonraki.item.id}`);
    else nav(`${ayar.taban}/${kart.slug}`);
  };

  // Test başarıyla bitince: dersi tamamla, modalı kapat, sayfada kal
  // (kullanıcı yeşil tik + "Tamamlandı" onayını görsün, sonra İleri der).
  const testGecildi = () => {
    if (zorunluOlcumler.length === 0) void tamamla(mevcut.item.id);
    setTestAcik(false);
  };

  // Tek TOC kaynağı — hem masaüstü sidebar hem mobil panel kullanır.
  // Bölümler açılır/kapanır; varsayılan açık.
  const tocIcerik = kart.bolumler.map((bolum) => {
    const kapali = kapaliBolumler.has(bolum.id);
    return (
    <div key={bolum.id}>
      <button
        onClick={() => bolumToggle(bolum.id)}
        className="w-full flex items-center justify-between gap-2 pl-3 pr-1.5 py-1 mb-1.5 group/bolum"
      >
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink-quiet group-hover/bolum:text-ink-soft transition text-left">
          {bolum.ad}
        </span>
        <Icon
          name="ChevronDown"
          size={13}
          className={`flex-none text-ink-quiet transition-transform ${kapali ? '-rotate-90' : ''}`}
        />
      </button>
      {!kapali && (
      <div className="flex flex-col gap-0.5">
        {bolum.itemlar.map((it) => {
          const aktif = it.id === mevcut.item.id;
          const done = tamamlanan.has(it.id);
          return (
            <button
              key={it.id}
              onClick={() => {
                setTocAcik(false);
                nav(`${ayar.taban}/${kart.slug}/${it.id}`);
              }}
              className={`flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-r-lg text-left transition border-l-2 active:scale-[0.99] ${
                aktif ? 'border-brand bg-brand-soft/60' : 'border-transparent hover:bg-surface-2'
              }`}
            >
              <Icon
                name={done ? 'CheckCircle2' : 'Circle'}
                size={15}
                className={`flex-none ${done ? 'text-success' : 'text-ink-quiet'}`}
              />
              <span
                className={`text-[13px] leading-snug ${
                  aktif ? 'text-brand-deep font-semibold' : 'text-ink-soft'
                }`}
              >
                {it.ad}
              </span>
            </button>
          );
        })}
      </div>
      )}
    </div>
    );
  });

  return (
    <div className="w-full py-8 sm:py-12 pl-4 sm:pl-6 pr-5 sm:pr-10">
      <nav className="flex items-center gap-2 font-mono text-[11px] tracking-wide uppercase text-ink-mute mb-6 flex-wrap">
        <button onClick={() => nav(ayar.taban)} className="hover:text-ink transition">{ayar.etiket}</button>
        <Icon name="ChevronRight" size={12} className="text-ink-quiet" />
        <button onClick={() => nav(`${ayar.taban}/${kart.slug}`)} className="hover:text-ink transition">
          {kart.ad}
        </button>
        <Icon name="ChevronRight" size={12} className="text-ink-quiet" />
        <span className="text-ink-soft">{mevcut.bolum.ad}</span>
      </nav>

      {/* Mobil TOC — açılır */}
      <div className="lg:hidden mb-6">
        <button
          onClick={() => setTocAcik((a) => !a)}
          className="w-full flex items-center gap-3 bg-surface border border-line rounded-xl px-4 py-3 text-left active:scale-[0.99] transition"
        >
          <Icon name="ListChecks" size={17} className="text-ink-soft flex-none" />
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-semibold text-ink truncate">Bölümler</span>
            <span className="font-mono text-[10px] uppercase tracking-wide text-ink-mute tnum">
              {String(mevcut.sira + 1).padStart(2, '0')} / {String(hepsi.length).padStart(2, '0')} · {mevcut.bolum.ad}
            </span>
          </span>
          <Icon
            name="ChevronDown"
            size={16}
            className={`text-ink-mute flex-none transition-transform ${tocAcik ? 'rotate-180' : ''}`}
          />
        </button>
        {tocAcik && (
          <div className="mt-2 bg-surface border border-line rounded-xl p-3 flex flex-col gap-4">
            {tocIcerik}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[264px_minmax(0,1fr)] gap-8 lg:gap-14">
        <aside className="hidden lg:block border-r border-line-soft">
          <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto flex flex-col gap-5 pr-4 py-6 kesfet-toc-scroll">
            {tocIcerik}
            {isIsletme && user && (
              <IsletmeGuncelDurum
                kart={kart}
                tamamlanan={tamamlanan}
                toplamIslem={hepsi.length}
                bitenIslem={hepsi.filter((x) => tamamlanan.has(x.item.id)).length}
              />
            )}
          </div>
        </aside>

        <article className="min-w-0 max-w-[1100px] w-full">
          <div className="flex items-center gap-3 mb-4">
            <span className="chip">{ders ? 'Ders' : 'Alıştırma'}</span>
            {bitti && <span className="chip chip-success">Tamamlandı</span>}
          </div>
          <h1 className="font-display text-[30px] sm:text-[38px] leading-[1.08] font-bold tracking-[-0.02em] text-ink mb-8 text-balance">
            {mevcut.item.ad}
          </h1>

          {yukleniyor ? (
            <div className="h-48 bg-surface-2 rounded-[18px] animate-pulse" />
          ) : !user ? (
            <KesfetKayitDuvari
              donusUrl={`${ayar.taban}/${kart.slug}/${mevcut.item.id}`}
              kartSlug={kart.slug}
              taban={ayar.taban}
            />
          ) : (
          <>
          {icerikVar ? (
            <IcerikGoruntuleyici key={mevcut.item.id} icerik={proseBloklar} />
          ) : tumBloklar.length === 0 ? (
            <div className="relative bg-surface border border-line rounded-[18px] px-6 py-16 text-center overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-line" />
              <div className="absolute inset-x-0 top-[3px] h-px bg-line-soft" />
              <span className="w-14 h-14 rounded-2xl bg-surface-2 text-ink-quiet grid place-items-center mx-auto mb-5">
                <Icon name={ders ? 'BookOpen' : 'Pencil'} size={24} />
              </span>
              <p className="font-display text-[19px] font-bold text-ink">İçerik yakında</p>
              <p className="text-[14px] text-ink-mute mt-2 max-w-sm mx-auto leading-relaxed">
                Bu {ders ? 'dersin anlatımı' : 'alıştırma'} henüz eklenmedi. Şimdilik yapının
                iskeletini geziyorsun; içerik sonra doldurulacak.
              </p>
            </div>
          ) : null}

          {maliTablolarAdimi && (
            <div className="mt-8">
              <IsletmeMaliTablolar kart={kart} tamamlanan={tamamlanan} />
            </div>
          )}

          {testVar && (
            <button
              type="button"
              className={`kt-baslat ${bitti ? 'kt-baslat-bitti' : ''}`}
              onClick={() => setTestAcik(true)}
            >
              <span className="kt-baslat-ikon">
                <Icon name={bitti ? 'CheckCircle2' : 'Pencil'} size={18} />
              </span>
              <span className="kt-baslat-metin">
                <span className="kt-baslat-baslik">{bitti ? 'Testi Tekrar Çöz' : 'Teste Başla'}</span>
                <span className="kt-baslat-alt">
                  {bitti
                    ? `${testSorulari.length} soru · tamamlandı`
                    : `${testSorulari.length} soru · öğrendiğini dene`}
                </span>
              </span>
              <Icon name="ArrowRight" size={18} className="kt-baslat-ok" />
            </button>
          )}

          {olcumSorulari.length > 0 && (
            <section className="mt-8 rounded-[18px] border border-line bg-surface p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-brand-soft text-brand-deep grid place-items-center flex-none">
                  <Icon name="ListChecks" size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-bold text-ink">Ölçümlü görev</h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink-mute">
                    Bu görev mevcut Question Engine’de çözülür. Doğru çözüm yetkinlik ilerlemeni günceller; ders ancak zorunlu görev tamamlanınca biter.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    {olcumSorulari.map((soru, index) => {
                      const cozuldu = cozulenOlcumler.has(soru.soru_id);
                      return (
                        <button
                          key={soru.soru_id}
                          type="button"
                          onClick={() => nav(`/problemler/${soru.soru_id}`, { state: { kesfetDonus: pathname } })}
                          className="w-full flex items-center gap-3 rounded-xl border border-line-soft bg-surface-2 px-4 py-3 text-left hover:border-brand/40 transition"
                        >
                          <Icon name={cozuldu ? 'CheckCircle2' : 'Circle'} size={17} className={cozuldu ? 'text-success' : 'text-ink-mute'} />
                          <span className="flex-1 text-sm font-semibold text-ink">Görev {index + 1}</span>
                          <span className="text-xs text-ink-mute">{cozuldu ? 'Doğru çözüldü' : soru.zorunlu ? 'Zorunlu' : 'İsteğe bağlı'}</span>
                          <Icon name="ArrowRight" size={15} className="text-ink-mute" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}

          {mevzuatBaglari.length > 0 && (
            <section className="mt-6 rounded-[18px] border border-line bg-surface p-5 sm:p-6" aria-label="Mevzuat bağlantıları">
              <div className="flex items-center gap-2">
                <Icon name="Scale" size={17} className="text-brand-deep" />
                <h2 className="font-display text-lg font-bold text-ink">Bu olaydaki mevzuat</h2>
              </div>
              <div className="mt-4 divide-y divide-line-soft border-y border-line-soft">
                {mevzuatBaglari.map((bag) => (
                  <div key={bag.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{bag.kaynak} md. {bag.maddeNo}</span>
                      <span className="chip">{bag.effectiveDate} tarihinde geçerli</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{bag.baslik}</p>
                    {bag.aciklama && <p className="mt-1 text-xs leading-relaxed text-ink-mute">{bag.aciklama}</p>}
                    {bag.sourceUrl && (
                      <a href={bag.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-deep hover:underline">
                        Resmî kaynağı aç <Icon name="ExternalLink" size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-ink-mute">Mevzuat işlem tarihine göre gösterilir; bilgilendirme amaçlıdır.</p>
            </section>
          )}

          <div className="flex items-center justify-between gap-3 mt-10 pt-6 border-t border-line-soft">
            <button
              onClick={() => onceki && nav(`${ayar.taban}/${kart.slug}/${onceki.item.id}`)}
              disabled={!onceki}
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-soft disabled:opacity-30 disabled:cursor-not-allowed hover:text-ink active:scale-[0.98] transition"
            >
              <Icon name="ArrowLeft" size={16} /> Önceki
            </button>

            <span className="font-mono text-[11px] tracking-wide text-ink-mute tnum">
              {String(mevcut.sira + 1).padStart(2, '0')} / {String(hepsi.length).padStart(2, '0')}
            </span>

            {!olcumTamam ? (
              <button
                onClick={() => zorunluOlcumler[0] && nav(`/problemler/${zorunluOlcumler[0].soru_id}`, { state: { kesfetDonus: pathname } })}
                className="btn btn-primary active:scale-[0.98]"
              >
                Ölçümlü görevi çöz
                <Icon name="ArrowRight" size={16} className="ml-1" />
              </button>
            ) : testVar && !bitti ? (
              // Testi olan derste ders, testi AÇIP BİTİRMEDEN tamamlanamaz.
              // (Skor kapısı yok — testi bitirmek yeterli; bkz. KesfetTestModal.)
              <button onClick={() => setTestAcik(true)} className="btn btn-primary active:scale-[0.98]">
                Teste Başla
                <Icon name="ArrowRight" size={16} className="ml-1" />
              </button>
            ) : !yayinlanabilir ? (
              <button onClick={() => nav(`${ayar.taban}/${kart.slug}`)} className="btn btn-soft">
                Karta dön
              </button>
            ) : (
              <button onClick={tamamlaVeIlerle} className="btn btn-primary active:scale-[0.98]">
                {sonraki ? (bitti ? 'İleri' : 'Tamamla ve İleri') : bitti ? 'Karta dön' : 'Tamamla ve Bitir'}
                <Icon name="ArrowRight" size={16} className="ml-1" />
              </button>
            )}
          </div>
          </>
          )}
        </article>
      </div>

      {testAcik && testVar && (
        <KesfetTestModal
          key={mevcut.item.id}
          sorular={testSorulari.map((b) => ({ type: b.type, props: b.props }))}
          baslik={mevcut.item.ad}
          onKapat={() => setTestAcik(false)}
          onTamamla={testGecildi}
        />
      )}
    </div>
  );
};

// Anonim kullanıcı ders içeriğine tıklayınca — kayıt duvarı (vitrin: TOC + başlık
// açık kalır, içerik + test kilitli). Sözlük her zaman serbest; burada kurs ürünü
// kayıt karşılığı. Giriş sonrası bu derse geri döner (authDonusYaz).
const KesfetKayitDuvari = ({
  donusUrl,
  kartSlug,
  taban,
}: {
  donusUrl: string;
  kartSlug: string;
  taban: string;
}) => {
  const nav = useNavigate();
  const giriseGit = () => {
    authDonusYaz(donusUrl);
    nav('/giris');
  };
  const kazanimlar = [
    { icon: 'BookOpen', metin: 'Tüm ders anlatımları' },
    { icon: 'ListChecks', metin: 'İnteraktif testler ve alıştırmalar' },
    { icon: 'Flame', metin: 'İlerleme, puan, rozet ve streak' },
  ] as const;
  return (
    <div className="relative bg-surface border border-line rounded-[18px] px-6 sm:px-10 py-12 sm:py-14 text-center overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-line" />
      <div className="absolute inset-x-0 top-[3px] h-px bg-line-soft" />
      <span className="w-14 h-14 rounded-2xl bg-brand-soft text-brand-deep grid place-items-center mx-auto mb-5">
        <Icon name="Lock" size={24} />
      </span>
      <h2 className="font-display text-[22px] sm:text-[26px] font-bold text-ink">
        Bu ders üyelere özel
      </h2>
      <p className="text-[14px] sm:text-[15px] text-ink-mute mt-3 max-w-md mx-auto leading-relaxed">
        Ücretsiz kaydol; dersin tamamı, interaktif testler ve ilerleme takibi senin olsun.
        Sözlük her zaman serbest.
      </p>
      <ul className="mt-7 mb-8 flex flex-col gap-2.5 max-w-xs mx-auto text-left">
        {kazanimlar.map((k) => (
          <li key={k.metin} className="flex items-center gap-3 text-[14px] text-ink-soft">
            <span className="w-8 h-8 rounded-lg bg-surface-2 text-brand-deep grid place-items-center flex-none">
              <Icon name={k.icon} size={15} />
            </span>
            {k.metin}
          </li>
        ))}
      </ul>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button onClick={giriseGit} className="btn btn-primary active:scale-[0.98]">
          Ücretsiz Kaydol
          <Icon name="ArrowRight" size={16} className="ml-1" />
        </button>
        <button
          onClick={() => nav(`${taban}/${kartSlug}`)}
          className="btn btn-soft active:scale-[0.98]"
        >
          Kart sayfasına dön
        </button>
      </div>
      <button
        onClick={giriseGit}
        className="mt-5 text-[13px] text-ink-mute hover:text-ink font-semibold transition"
      >
        Zaten üye misin? Giriş yap
      </button>
    </div>
  );
};
