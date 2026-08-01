import { useState } from 'react';
import { Icon } from './Icon';
import { paraFormat } from '../lib/format';
import { useEsc } from '../lib/hooks/use-esc';
import type {
  Belge,
  CekBelge,
  DekontBelge,
  FaturaBelge,
  FaturaKalem,
  PerakendeFisBelge,
  SenetBelge,
} from '../types';

interface Props {
  belgeler: Belge[];
  onKapat: () => void;
}

export const BelgeModal = ({ belgeler, onKapat }: Props) => {
  useEsc(onKapat);
  const [aktifIdx, setAktifIdx] = useState(0);
  const aktif = belgeler[aktifIdx];

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onKapat}
    >
      <div
        className="bg-surface-2 max-w-4xl w-full max-h-[92vh] overflow-auto rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-surface-2 border-b border-line-strong px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute mb-0.5 font-bold">
                Soruyla Birlikte Verilen Belgeler
              </div>
              <div className="font-display text-lg tracking-tight font-bold">
                {belgeler.length === 1
                  ? `1 Belge`
                  : `${belgeler.length} Belge · ${aktifIdx + 1}. görüntüleniyor`}
              </div>
            </div>
            {belgeler.length > 1 && (
              <div className="hidden sm:flex gap-1.5 ml-4">
                {belgeler.map((b, i) => (
                  <button
                    key={i}
                    onClick={() => setAktifIdx(i)}
                    className={`text-[10px] tracking-[0.2em] uppercase font-bold px-2.5 py-1.5 rounded transition ${
 i === aktifIdx
 ? 'bg-ink text-bg '
 : 'bg-surface text-ink-soft hover:bg-line-soft '
 }`}
                  >
                    {belgeKisaAd(b)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onKapat}
            className="text-ink-mute hover:text-ink"
          >
            <Icon name="X" size={20} />
          </button>
        </div>
        <div className="p-4 sm:p-8 bg-line-soft/40">
          <BelgeGovde belge={aktif} />
        </div>
      </div>
    </div>
  );
};

const belgeKisaAd = (b: Belge): string => {
  if (b.tur === 'fatura') return b.baslik || 'Fatura';
  if (b.tur === 'perakende-fis') return b.baslik || 'Perakende Fişi';
  if (b.tur === 'cek') return b.baslik || 'Çek';
  if (b.tur === 'senet') return b.baslik || (b.senetTipi === 'police' ? 'Poliçe' : 'Bono');
  if (b.tur === 'dekont') return b.baslik || 'Banka Dekontu';
  return 'Belge';
};

const BIRLER = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const ONLAR = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];

const ucBasamakYazi = (n: number): string => {
  if (n === 0) return '';
  const yuz = Math.floor(n / 100);
  const kalan = n % 100;
  const onluk = Math.floor(kalan / 10);
  const birlik = kalan % 10;
  let r = '';
  if (yuz > 0) r += yuz === 1 ? 'yüz' : `${BIRLER[yuz]}yüz`;
  if (onluk > 0) r += ONLAR[onluk];
  if (birlik > 0) r += BIRLER[birlik];
  return r;
};

const yaziyla = (n: number): string => {
  if (n === 0) return 'sıfır';
  const tam = Math.floor(n);
  const kurus = Math.round((n - tam) * 100);

  let metin = '';
  const milyar = Math.floor(tam / 1_000_000_000);
  const milyon = Math.floor((tam % 1_000_000_000) / 1_000_000);
  const bin = Math.floor((tam % 1_000_000) / 1_000);
  const yuzler = tam % 1_000;

  if (milyar > 0) metin += `${ucBasamakYazi(milyar)}milyar`;
  if (milyon > 0) metin += `${ucBasamakYazi(milyon)}milyon`;
  if (bin > 0) metin += bin === 1 ? 'bin' : `${ucBasamakYazi(bin)}bin`;
  if (yuzler > 0) metin += ucBasamakYazi(yuzler);
  if (!metin) metin = 'sıfır';
  metin += 'türklirası';
  if (kurus > 0) metin += ucBasamakYazi(kurus) + 'kuruş';
  return metin;
};

const tutarYazi = (n: number): string => {
  const tam = Math.floor(n);
  const kurus = Math.round((n - tam) * 100);
  return `${tam.toLocaleString('tr-TR')} TL ${kurus.toString().padStart(2, '0')} Krş`;
};

const kalemTutarlar = (k: FaturaKalem, kdvOrani: number) => {
  const brut = k.miktar * k.birimFiyat;
  const iskonto = k.iskontoOrani ? brut * (k.iskontoOrani / 100) : 0;
  const matrah = brut - iskonto;
  const kdv = matrah * (kdvOrani / 100);
  return { brut, iskonto, matrah, kdv };
};

// =====================
// FATURA — modern, minimalist (örnek 5)
// =====================
const FaturaGorunum = ({ f }: { f: FaturaBelge }) => {
  const tutarlar = f.kalemler.map((k) => kalemTutarlar(k, f.kdvOrani));
  const toplamBrut = tutarlar.reduce((a, t) => a + t.brut, 0);
  const toplamIskonto = tutarlar.reduce((a, t) => a + t.iskonto, 0);
  const toplamMatrah = tutarlar.reduce((a, t) => a + t.matrah, 0);
  const toplamKdv = tutarlar.reduce((a, t) => a + t.kdv, 0);
  const tevkifatli = f.tevkifatPay != null && f.tevkifatPayda != null && f.tevkifatPay > 0;
  const tevkifatTutar = tevkifatli ? toplamKdv * (f.tevkifatPay! / f.tevkifatPayda!) : 0;
  const odenecek = toplamMatrah + toplamKdv - tevkifatTutar;

  const baslik = f.baslik || (f.faturaTipi === 'iade' ? 'İADE FATURASI' : 'TİCARİ FATURA');

  return (
    <div className="bg-surface text-ink max-w-3xl mx-auto px-8 sm:px-12 py-10 shadow-xl border border-line font-sans">
      {/* Üst pill başlık */}
      <div className="flex justify-center mb-3">
        <div className="border border-ink rounded-full px-5 py-1 text-xs tracking-wide font-semibold">
          {f.satici.unvan}
        </div>
      </div>

      {/* TİCARİ FATURA başlığı */}
      <div className="flex items-center justify-center gap-3 mb-7">
        <span className="text-premium text-xl">✻</span>
        <h2 className="font-display text-2xl sm:text-3xl tracking-tight font-bold">{baslik}</h2>
        <span className="text-premium text-xl">✻</span>
      </div>

      {/* Fatura No / Tarih */}
      <div className="text-xs mb-6 space-y-0.5">
        <div>
          <span className="font-bold">Fatura No: </span>
          <span className="font-mono">{f.faturaNo}</span>
        </div>
        <div>
          <span className="font-bold">Tarih: </span>
          <span>{f.tarih}</span>
        </div>
        {f.ettn && (
          <div className="text-[10px] text-ink-mute font-mono">
            ETTN: {f.ettn}
          </div>
        )}
      </div>

      {/* Satıcı / Alıcı */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8 text-xs">
        <FaturaTaraf etiket="SATICI" t={f.satici} />
        <FaturaTaraf etiket="ALICI" t={f.alici} />
      </div>

      {/* Kalemler tablosu */}
      <table className="w-full text-xs border-collapse mb-6">
        <thead>
          <tr className="border-b-2 border-ink">
            <th className="text-left font-bold py-2 pr-2">Açıklama</th>
            <th className="text-right font-bold py-2 px-2 w-16">Miktar</th>
            <th className="text-right font-bold py-2 px-2 w-14">KDV</th>
            <th className="text-right font-bold py-2 px-2 w-24">Birim Fiyatı</th>
            <th className="text-right font-bold py-2 pl-2 w-24">Toplam</th>
          </tr>
        </thead>
        <tbody>
          {f.kalemler.map((k, i) => {
            const t = tutarlar[i];
            return (
              <tr key={i} className="border-b border-line">
                <td className="py-3 pr-2">
                  {k.aciklama}
                  {k.iskontoOrani ? (
                    <span className="block text-[10px] text-ink-mute">
                      İskonto: %{k.iskontoOrani}
                    </span>
                  ) : null}
                </td>
                <td className="py-3 px-2 text-right font-mono">
                  {k.miktar.toLocaleString('tr-TR')} {k.birim}
                </td>
                <td className="py-3 px-2 text-right font-mono">%{f.kdvOrani}</td>
                <td className="py-3 px-2 text-right font-mono">{paraFormat(k.birimFiyat)} ₺</td>
                <td className="py-3 pl-2 text-right font-mono font-bold">
                  {paraFormat(t.matrah)} ₺
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Toplamlar */}
      <div className="border-t-2 border-ink pt-4">
        <div className="ml-auto max-w-xs space-y-1.5 text-xs font-mono">
          <div className="flex justify-between">
            <span className="font-bold">ARA TOPLAM</span>
            <span>{paraFormat(toplamBrut)} ₺</span>
          </div>
          {toplamIskonto > 0 && (
            <div className="flex justify-between text-ink-soft">
              <span>İSKONTO</span>
              <span>− {paraFormat(toplamIskonto)} ₺</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="font-bold">VERGİ (%{f.kdvOrani})</span>
            <span>{paraFormat(toplamKdv)} ₺</span>
          </div>
          {tevkifatli && (
            <div className="flex justify-between text-ink-soft">
              <span>KDV TEVKİFATI ({f.tevkifatPay}/{f.tevkifatPayda})</span>
              <span>− {paraFormat(tevkifatTutar)} ₺</span>
            </div>
          )}
          <div className="flex justify-between border-t border-ink pt-2 mt-2 text-sm font-bold">
            <span>GENEL TOPLAM</span>
            <span>{paraFormat(odenecek)} ₺</span>
          </div>
        </div>
      </div>

      {/* Yalnız + notlar */}
      <div className="mt-6 pt-4 border-t border-line text-xs space-y-2">
        <div>
          <span className="font-bold">Yalnız: </span>
          <span className="font-display italic">#{tutarYazi(odenecek)}#</span>
        </div>
        {f.tevkifatAciklama && (
          <div className="text-ink-mute italic">{f.tevkifatAciklama}</div>
        )}
        {f.odemeBilgisi && (
          <div>
            <span className="font-bold">Ödeme: </span>
            {f.odemeBilgisi}
          </div>
        )}
        {f.not && <div className="text-ink-soft">{f.not}</div>}
      </div>
    </div>
  );
};

const FaturaTaraf = ({ etiket, t }: { etiket: string; t: import('../types').TarafBilgi }) => (
  <div>
    <div className="font-bold mb-1">{etiket}</div>
    <div className="font-bold">{t.unvan}</div>
    <div className="text-ink-soft leading-relaxed mt-1 space-y-0.5">
      {t.adres && <div>{t.adres}</div>}
      {t.vergiDairesi && <div>V.D. {t.vergiDairesi}</div>}
      {t.vkn && <div className="font-mono">VKN: {t.vkn}</div>}
      {t.tcKimlik && <div className="font-mono">TC: {t.tcKimlik}</div>}
    </div>
  </div>
);

// =====================
// PERAKENDE FİŞİ — manuel fiş tarzı (örnek 4)
// =====================
const PerakendeFisGorunum = ({ f }: { f: PerakendeFisBelge }) => {
  const tutarlar = f.kalemler.map((k) => {
    const matrah = k.miktar * k.birimFiyat;
    const kdv = matrah * (k.kdvOrani / 100);
    return { matrah, kdv, toplam: matrah + kdv };
  });
  const toplamMatrah = tutarlar.reduce((a, t) => a + t.matrah, 0);
  const toplamKdv = tutarlar.reduce((a, t) => a + t.kdv, 0);
  const odenecek = toplamMatrah + toplamKdv;
  // Boş satır sayısı için
  const bosSatir = Math.max(0, 7 - f.kalemler.length);

  return (
    <div className="bg-surface max-w-md mx-auto p-6 shadow-xl border-2 border-ink text-ink font-serif">
      {/* Üst kısım: firma | mali damga | başlık */}
      <div className="grid grid-cols-3 gap-3 items-start mb-4">
        <div className="col-span-1">
          <div className="font-display font-bold text-base leading-tight">
            {f.isletme.unvan}
          </div>
          <div className="text-[10px] mt-1 leading-tight">
            <span className="font-semibold">Adres: </span>
            {f.isletme.adres ? (
              <span>{f.isletme.adres}</span>
            ) : (
              <span className="border-b border-dotted border-line-strong inline-block min-w-[80px]" />
            )}
          </div>
        </div>

        {/* Maliye damgası SVG */}
        <div className="col-span-1 flex justify-center">
          <svg viewBox="0 0 100 100" className="w-20 h-20">
            <defs>
              <path id="circle-text" d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
            </defs>
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="rgb(30, 64, 175)"
              strokeWidth="2"
            />
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="rgb(30, 64, 175)"
              strokeWidth="1"
            />
            <text
              fill="rgb(30, 64, 175)"
              fontSize="9"
              fontWeight="bold"
              fontFamily="serif"
              letterSpacing="1"
            >
              <textPath href="#circle-text" startOffset="5%">
                MALİYE BAKANLIĞI
              </textPath>
            </text>
            <text
              x="50"
              y="48"
              textAnchor="middle"
              fill="rgb(30, 64, 175)"
              fontSize="11"
              fontWeight="bold"
              fontFamily="serif"
            >
              T.C.
            </text>
            <text
              x="50"
              y="62"
              textAnchor="middle"
              fill="rgb(30, 64, 175)"
              fontSize="7"
              fontFamily="serif"
            >
              06
            </text>
          </svg>
        </div>

        <div className="col-span-1 text-right">
          <div className="font-display font-bold text-sm leading-tight">
            PERAKENDE
            <br />
            SATIŞ FİŞİ
          </div>
          <div className="text-[10px] mt-2 space-y-0.5 text-left inline-block">
            <div>
              <span className="font-semibold">SERİ : </span>
              <span className="font-mono">{f.fisNo.split('-')[0] || 'A'}</span>
            </div>
            <div>
              <span className="font-semibold">SIRA : </span>
              <span className="font-mono">{f.fisNo.split('-')[1] || f.fisNo}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Müşteri / Tarih */}
      <div className="flex items-end justify-between gap-3 mb-3 text-xs">
        <div className="flex-1">
          <span className="font-semibold">Müşteri: </span>
          <span className="border-b border-dotted border-line-strong inline-block min-w-[120px]">
            {f.not || ''}
          </span>
        </div>
        <div className="font-mono text-[11px]">
          {f.tarih}
          {f.saat && ` ${f.saat}`}
        </div>
      </div>

      {/* Kalemler tablosu */}
      <table className="w-full text-xs border-collapse border-2 border-ink mb-3">
        <thead>
          <tr className="border-b border-ink">
            <th className="border-r border-ink px-2 py-1 font-semibold tracking-wide">
              CİNSİ
            </th>
            <th className="border-r border-ink px-2 py-1 font-semibold tracking-wide w-16">
              MİKTARI
            </th>
            <th className="px-2 py-1 font-semibold tracking-wide w-24">TUTARI</th>
          </tr>
        </thead>
        <tbody>
          {f.kalemler.map((k, i) => {
            const t = tutarlar[i];
            return (
              <tr key={i} className="border-b border-line-strong">
                <td className="border-r border-line-strong px-2 py-1.5">{k.aciklama}</td>
                <td className="border-r border-line-strong px-2 py-1.5 text-center font-mono">
                  {k.miktar.toLocaleString('tr-TR')}
                </td>
                <td className="px-2 py-1.5 text-right font-mono">{paraFormat(t.toplam)}</td>
              </tr>
            );
          })}
          {Array.from({ length: bosSatir }).map((_, i) => (
            <tr key={`b${i}`} className="border-b border-line-strong">
              <td className="border-r border-line-strong px-2 py-1.5">&nbsp;</td>
              <td className="border-r border-line-strong px-2 py-1.5">&nbsp;</td>
              <td className="px-2 py-1.5">&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Yalnız satırı */}
      <div className="text-xs mb-3">
        <span className="font-semibold">Yalnız: </span>
        <span className="border-b border-dotted border-line-strong inline-block min-w-[60%] font-display italic">
          {tutarYazi(odenecek)}
        </span>
      </div>

      {/* KDV/TOPLAM kutuları */}
      <div className="grid grid-cols-2 border-2 border-ink text-xs">
        <div className="border-r border-ink grid grid-cols-2">
          <div className="border-r border-ink px-2 py-1.5 font-semibold">K.D.V.</div>
          <div className="px-2 py-1.5 text-center font-mono">
            {paraFormat(toplamKdv)}
          </div>
        </div>
        <div className="grid grid-cols-2">
          <div className="border-r border-ink px-2 py-1.5 font-semibold">TOPLAM</div>
          <div className="px-2 py-1.5 text-center font-mono font-bold">
            {paraFormat(odenecek)}
          </div>
        </div>
        <div className="border-t border-r border-ink px-2 py-1 text-[10px] text-center col-span-2 font-semibold">
          K.D.V. DAHİLDİR
        </div>
      </div>

      {/* Alt: ödeme yöntemi */}
      {f.odemeYontemi && (
        <div className="mt-3 text-[10px] text-ink-soft text-right">
          Ödeme: <span className="font-bold">{f.odemeYontemi}</span>
        </div>
      )}

      {/* Vergi dairesi/VKN */}
      <div className="mt-3 pt-2 border-t border-line-strong text-[9px] text-ink-mute leading-tight">
        {f.isletme.vergiDairesi && f.isletme.vkn && (
          <div>
            {f.isletme.vergiDairesi} V.D. {f.isletme.vkn}
          </div>
        )}
        {f.zNo && <div>Z NO: {f.zNo}</div>}
        {f.ettn && <div className="break-all">ETTN: {f.ettn}</div>}
      </div>
    </div>
  );
};

// =====================
// ÇEK — wavy banka çeki (örnek 3)
// =====================
const CekGorunum = ({ c }: { c: CekBelge }) => (
  <div className="flex justify-center py-2">
    <div className="relative bg-surface-2 max-w-2xl w-full p-3 shadow-2xl">
      {/* Wavy çek body */}
      <div
        className="relative border-2 border-line-strong bg-surface overflow-hidden"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='40' viewBox='0 0 200 40'><path d='M0 20 Q 25 5 50 20 T 100 20 T 150 20 T 200 20' fill='none' stroke='%23d6d3d1' stroke-width='1' opacity='0.6'/><path d='M0 30 Q 25 15 50 30 T 100 30 T 150 30 T 200 30' fill='none' stroke='%23d6d3d1' stroke-width='1' opacity='0.4'/></svg>")`,
          backgroundSize: '200px 40px',
          backgroundRepeat: 'repeat',
        }}
      >
        <div className="px-7 py-6 text-ink font-sans">
          {/* Üst: Banka adı | Nº */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="font-display text-xl font-bold tracking-tight leading-tight">
                {c.bankaAdi}
              </div>
              {c.subeAdi && (
                <div className="text-[11px] text-ink-soft mt-0.5">{c.subeAdi}</div>
              )}
            </div>
            <div className="text-right">
              <span className="text-ink-soft text-sm align-top">N</span>
              <sup className="text-ink-soft text-xs">o</sup>
              <span className="font-display font-bold text-xl tracking-wider ml-0.5">
                {c.cekNo}
              </span>
            </div>
          </div>

          {/* Ödemeyi Alacak | TL */}
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 items-end mb-5">
            <div className="text-xs text-ink-soft">Ödemeyi Alacak</div>
            <div className="font-display text-lg font-bold border-b border-line-strong pb-0.5 px-2">
              {c.lehtar}
            </div>
            <div className="text-xs text-ink-soft">TL</div>
            <div className="font-display text-lg font-bold bg-surface border border-line-strong px-3 py-0.5 min-w-[110px] text-right">
              {paraFormat(c.tutar)}
            </div>
          </div>

          {/* Yazıyla */}
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end mb-6">
            <div className="font-display text-base italic font-semibold border-b border-line-strong pb-0.5 text-center px-2">
              #{yaziyla(c.tutar)}#
            </div>
            <div className="text-xs text-ink-soft">Türk Lirası</div>
          </div>

          {/* imza | Tarih */}
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 items-end mb-3">
            <div className="text-xs text-ink-soft">imza</div>
            <div className="font-display italic text-base border-b border-line-strong pb-0.5 text-center px-2 text-ink-soft">
              {c.kesideci.unvan}
            </div>
            <div className="text-xs text-ink-soft">Tarih</div>
            <div className="font-mono text-sm border-b border-line-strong pb-0.5 px-2">
              {c.duzenlemeTarihi}
            </div>
          </div>

          {/* MICR satırı */}
          <div className="font-mono text-base tracking-[0.2em] text-ink-soft mt-6 pt-2">
            {(c.cekNo + (c.subeKodu || '0000') + (c.hesapNo?.replace(/[^0-9]/g, '') || '00000000') + '00')
              .slice(0, 22)
              .padEnd(22, '0')}
          </div>
        </div>
      </div>

      {/* Vade tarihi yan etiket — çekin altına minik info */}
      <div className="flex justify-between items-center px-3 pt-3 text-[10px] text-ink-mute font-mono">
        <span>
          Vade: <span className="text-danger font-bold">{c.vadeTarihi}</span>
          {c.duzenlemeYeri && <span className="ml-2">· Yer: {c.duzenlemeYeri}</span>}
        </span>
        {c.iban && <span className="text-[9px]">{c.iban}</span>}
      </div>

      {c.not && (
        <div className="mt-2 px-3 text-[11px] text-ink-soft italic">{c.not}</div>
      )}
    </div>
  </div>
);

// =====================
// SENET — geleneksel bono (örnek 2)
// =====================
const SenetGorunum = ({ s }: { s: SenetBelge }) => {
  const isPolice = s.senetTipi === 'police';

  return (
    <div className="flex justify-center py-2">
      <div className="bg-surface max-w-3xl w-full p-6 sm:p-10 shadow-2xl border border-line-strong text-ink font-serif">
        {/* Üst beş kolon: Vade | Ödeme Tarihi | Türk Lirası | Kuruş | No */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          <SenetUstAlan etiket="Vade" deger={s.vadeTarihi} kirmizi />
          <SenetUstAlan etiket="Ödeme Tarihi" deger={s.vadeTarihi} kirmizi />
          <SenetUstAlan
            etiket="Türk Lirası"
            deger={`#${Math.floor(s.tutar).toLocaleString('tr-TR')}#`}
            kirmizi
            mono
          />
          <SenetUstAlan
            etiket="Kuruş"
            deger={Math.round((s.tutar - Math.floor(s.tutar)) * 100)
              .toString()
              .padStart(2, '0')}
            kirmizi
            mono
          />
          <SenetUstAlan etiket="No" deger={s.senetNo} kirmizi mono />
        </div>

        {/* Body paragraf */}
        <p className="text-sm leading-loose text-justify mb-5">
          İşbu emre muharrer{' '}
          <span className="font-bold">{isPolice ? 'poliçemiz' : 'senedim'}</span> mukabilinde{' '}
          <SenetDolgu deger={s.vadeTarihi} />
          tarihinde Sayın <SenetDolgu deger={s.lehtar.unvan} genis /> veya emrühavalesine,{' '}
          yukarıda yazılı olan yalnız{' '}
          <SenetDolgu
            deger={`#${yaziyla(s.tutar).replace('türklirası', 'türklirası')}#`}
            genis
          />{' '}
          Türk Lirası{' '}
          <SenetDolgu
            deger={Math.round((s.tutar - Math.floor(s.tutar)) * 100)
              .toString()
              .padStart(2, '0')}
          />{' '}
          Kuruş ödeyeceği<span className="text-danger font-bold">m</span>. Bedeli{' '}
          <SenetDolgu deger={s.not ? s.not.toLocaleLowerCase('tr-TR') : 'nakden'} /> ahzolunmuştur.
          İşbu bono vadesinde ödenmediği takdirde müteakip bonolarında muacceliyet kesbedeceğini,
          ihtilaf halinde <SenetDolgu deger={s.vadeYeri || 'İstanbul'} /> Mahkemelerinin yetkili
          olduğunu şimdiden kabul ederi
          <span className="text-danger font-bold">m</span>.
        </p>

        {/* Düzenleme tarihi sağ */}
        <div className="text-right mb-5 text-sm">
          Düzenleme Tarihi: <SenetDolgu deger={s.duzenlemeTarihi} mono />
        </div>

        {/* Alt: Ödeyecek | imza */}
        <div className="grid grid-cols-3 gap-6 mt-4">
          <div className="col-span-2 relative">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-ink" />
            <div className="absolute left-0 top-0 w-2 h-px bg-ink" />
            <div className="absolute left-0 bottom-0 w-2 h-px bg-ink" />
            <div className="pl-4">
              <div
                className="absolute -left-2 top-1/2 -translate-y-1/2 origin-center text-base font-display font-bold tracking-widest"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                Ödeyecek
              </div>
              <div className="space-y-2 text-sm pl-6">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold whitespace-nowrap">İsim/ Unvan:</span>
                  <SenetDolgu deger={s.borclu.unvan} dolgun />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold whitespace-nowrap">Adres:</span>
                  <SenetDolgu deger={s.borclu.adres || ''} dolgun />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold whitespace-nowrap">Vergi No/ T.C. Kimlik No:</span>
                  <SenetDolgu
                    deger={s.borclu.vkn || s.borclu.tcKimlik || ''}
                    dolgun
                    mono
                  />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold whitespace-nowrap">Kefil:</span>
                  <SenetDolgu deger="" dolgun />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold whitespace-nowrap">Vergi No/ T.C. Kimlik No:</span>
                  <SenetDolgu deger="" dolgun mono />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-end pb-2">
            <div className="grid grid-cols-2 gap-6 text-center text-sm mb-3">
              <div className="text-ink-soft">imza</div>
              <div className="text-ink-soft">imza</div>
            </div>
            <div className="text-danger font-display italic text-base font-bold leading-tight text-center">
              ıslak
              <br />
              imza
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SenetUstAlan = ({
  etiket,
  deger,
  kirmizi,
  mono,
}: {
  etiket: string;
  deger: string;
  kirmizi?: boolean;
  mono?: boolean;
}) => (
  <div className="text-center">
    <div className="font-display font-bold text-sm mb-2">{etiket}</div>
    <div
      className={`border-b border-dotted border-line-strong pb-0.5 min-h-[1.5rem] ${
 kirmizi ? 'text-danger' : 'text-ink'
 } ${mono ? 'font-mono' : 'font-display italic'} font-bold text-sm`}
    >
      {deger || '\u00A0'}
    </div>
  </div>
);

const SenetDolgu = ({
  deger,
  genis,
  mono,
  dolgun,
}: {
  deger: string;
  genis?: boolean;
  mono?: boolean;
  dolgun?: boolean;
}) => (
  <span
    className={`relative inline-block border-b border-dotted border-line-strong text-danger ${
 mono ? 'font-mono' : 'font-display italic'
 } font-bold text-center px-1 ${
 dolgun ? 'flex-1 min-w-0' : genis ? 'min-w-[140px]' : 'min-w-[80px]'
 }`}
    style={dolgun ? { flex: 1 } : undefined}
  >
    {deger || '\u00A0'}
  </span>
);

// =====================
// DEKONT — banka dekontu (örnek 1)
// =====================
const islemTuruEtiket = (t: DekontBelge['islemTuru']): string => {
  const map: Record<DekontBelge['islemTuru'], string> = {
    HAVALE: "IBAN'a Para Transferi (HAVALE)",
    EFT: "IBAN'a Para Transferi (EFT)",
    KREDI_KULLANIMI: 'Kredi Kullanımı',
    KREDI_TAKSIT: 'Kredi Taksit Ödemesi',
    MASRAF: 'Banka Masrafı',
    FAIZ_GELIRI: 'Mevduat Faiz Geliri',
    POS_TAHSILATI: 'POS Tahsilatı',
  };
  return map[t];
};

const DekontGorunum = ({ d }: { d: DekontBelge }) => {
  const cikis = d.yon === 'ALACAK';
  const net = d.netTutar ?? d.tutar - (d.bsmv ?? 0) - (d.masraf ?? 0);

  return (
    <div className="bg-surface max-w-3xl mx-auto p-6 sm:p-8 shadow-xl border border-line text-ink font-sans">
      {/* Üst başlık: banka logo + banka legal info */}
      <div className="flex items-start justify-between gap-4 mb-1 pb-3">
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 28 28"
            className="w-6 h-6 text-success"
            fill="currentColor"
          >
            <path d="M14 4 C 8 4 6 9 6 13 C 6 17 9 21 14 24 C 19 21 22 17 22 13 C 22 9 20 4 14 4 Z M 14 8 C 17 8 19 10 19 13 C 19 16 17 19 14 21 C 11 19 9 16 9 13 C 9 10 11 8 14 8 Z" />
          </svg>
          <div className="font-display text-xl font-bold tracking-tight text-success uppercase">
            {d.bankaAdi}
          </div>
        </div>
        <div className="text-right text-[10px] text-ink-soft leading-snug">
          <div className="font-bold">{d.bankaAdi.toUpperCase()}</div>
          <div>Vergi No: 0000000000</div>
          <div>Vergi Dairesi: Büyük Mükellefler V.D.</div>
          <div>Ticaret Sicil No: 000000</div>
          <div>Mersis No: 0000000000000000</div>
        </div>
      </div>

      {/* İşlem türü merkezde */}
      <div className="text-center text-sm font-semibold border-b border-line-strong pb-3 mb-4">
        {islemTuruEtiket(d.islemTuru)}
      </div>

      {/* Üst iki sütun blok */}
      <div className="border border-line-strong grid grid-cols-1 sm:grid-cols-2 mb-3 text-xs">
        <div className="p-3 border-r border-line-strong space-y-1.5">
          <DekontSatir etiket="Şube Adı" deger={d.subeAdi || '—'} />
          <DekontSatir
            etiket="TC Kimlik No"
            deger={d.hesapSahibi.tcKimlik || maskele(d.hesapSahibi.vkn || '—')}
          />
          <DekontSatir
            etiket="İşlem Tarihi"
            deger={`${d.islemTarihi}${d.islemSaati ? ' ' + d.islemSaati : ''}`}
          />
          <DekontSatir etiket="Sorgu Numarası" deger={d.dekontNo} />
          <DekontSatir etiket="İşlem Referansı" deger={d.dekontNo} />
        </div>
        <div className="p-3 space-y-1.5">
          <DekontSatir etiket="Müşteri Adı" deger={d.hesapSahibi.unvan} />
          <DekontSatir
            etiket="Müşteri Adresi"
            deger={d.hesapSahibi.adres ? maskele(d.hesapSahibi.adres) : '—'}
          />
        </div>
      </div>

      {/* Gönderen / Gönderilen blok */}
      <div className="border border-line-strong mb-3 text-xs">
        <div className="p-3 space-y-1.5">
          <DekontSatir
            etiket={cikis ? 'Gönderen Kişi' : 'Alıcı Kişi'}
            deger={d.hesapSahibi.unvan}
          />
          {d.karsiTaraf && (
            <DekontSatir
              etiket={cikis ? 'Gönderilen Kişi' : 'Gönderen Kişi'}
              deger={d.karsiTaraf.unvan}
            />
          )}
          {d.karsiIban && (
            <DekontSatir etiket="Gönderilen IBAN" deger={d.karsiIban} mono />
          )}
          {d.iban && !d.karsiIban && (
            <DekontSatir etiket="IBAN" deger={d.iban} mono />
          )}
          <DekontSatir etiket="Gönderilen Banka" deger={d.bankaAdi} />
          <DekontSatir etiket="İşlem Yeri" deger="Mobil Şube" />
          <DekontSatir etiket="Açıklama" deger={d.aciklama} />
        </div>
      </div>

      {/* Tutar barı */}
      <div className="border border-line-strong px-3 py-2 mb-3 text-xs flex items-center gap-3">
        <span className="font-semibold">
          Tutar {paraFormat(d.tutar)} TL
        </span>
        <span className="text-ink-soft">Yalnız {yaziyla(d.tutar).replace('türklirası', ' Türk Lirası')}</span>
      </div>

      {/* BSMV / Masraf detayı (varsa) */}
      {((d.bsmv ?? 0) > 0 || (d.masraf ?? 0) > 0) && (
        <div className="border border-line-strong px-3 py-2 mb-3 text-xs space-y-1">
          {d.bsmv != null && d.bsmv > 0 && (
            <div className="flex justify-between">
              <span>BSMV</span>
              <span className="font-mono">{paraFormat(d.bsmv)} TL</span>
            </div>
          )}
          {d.masraf != null && d.masraf > 0 && (
            <div className="flex justify-between">
              <span>İşlem Masrafı</span>
              <span className="font-mono">{paraFormat(d.masraf)} TL</span>
            </div>
          )}
          <div className="flex justify-between border-t border-line-strong pt-1 mt-1 font-bold">
            <span>{cikis ? 'Hesaptan Çıkan Net' : 'Hesaba Giren Net'}</span>
            <span
              className={`font-mono ${cikis ? 'text-danger' : 'text-success'}`}
            >
              {cikis ? '−' : '+'} {paraFormat(net)} TL
            </span>
          </div>
        </div>
      )}

      {d.bakiye != null && (
        <div className="text-[10px] text-ink-soft mb-2">
          İşlem Sonrası Bakiye:{' '}
          <span className="font-mono font-bold">{paraFormat(d.bakiye)} TL</span>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-[10px] text-ink-soft pt-3 border-t border-line">
        Büyükdere Cad. No:000 Şişli/İstanbul · www.{d.bankaAdi.toLowerCase().replace(/\s+/g, '')}.com.tr
      </div>

      {d.not && (
        <div className="mt-2 text-[11px] text-ink-soft italic">{d.not}</div>
      )}
    </div>
  );
};

const DekontSatir = ({
  etiket,
  deger,
  mono,
}: {
  etiket: string;
  deger: string;
  mono?: boolean;
}) => (
  <div className="flex items-baseline gap-3">
    <span className="font-semibold w-32 shrink-0">{etiket}</span>
    <span className="text-ink-soft">:</span>
    <span className={mono ? 'font-mono break-all' : ''}>{deger}</span>
  </div>
);

const maskele = (s: string): string => {
  if (s.length < 6) return s;
  const ilk = s.slice(0, 2);
  const son = s.slice(-2);
  return `${ilk}${'*'.repeat(Math.min(s.length - 4, 10))}${son}`;
};

// Belge gövdesi — türe göre doğru görünümü render eder. Hem modalda hem soru
// ekranında (belge masası) inline kullanılır.
export const BelgeGovde = ({ belge }: { belge: Belge }) => {
  switch (belge.tur) {
    case 'fatura':
      return <FaturaGorunum f={belge} />;
    case 'perakende-fis':
      return <PerakendeFisGorunum f={belge} />;
    case 'cek':
      return <CekGorunum c={belge} />;
    case 'senet':
      return <SenetGorunum s={belge} />;
    case 'dekont':
      return <DekontGorunum d={belge} />;
    default:
      return null;
  }
};
