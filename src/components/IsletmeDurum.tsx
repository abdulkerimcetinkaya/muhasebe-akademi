import { useMemo } from 'react';
import { Icon } from './Icon';
import type { KesfetKart } from '../data/kesfet';
import {
  bilancoUret,
  defterHesapla,
  gelirTablosuUret,
  mizanUret,
  type MizanSatir,
} from '../lib/isletme-defter';

/**
 * İşletme dönem simülasyonu — canlı defter arayüzü (bkz. ADR-001, Faz 2.4).
 * Tamamlanan işlemlerin doğru kayıtlarından motor (isletme-defter) mizan/bilanço/
 * gelir tablosunu üretir; burada yalnızca gösterim.
 */

const tl = (n: number) => {
  const v = Math.abs(n) < 0.005 ? 0 : n; // -0,00 ve kayan nokta gürültüsünü temizle
  return `${v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
};

const net = (m: MizanSatir) => m.borcBakiye - m.alacakBakiye;

// ── Kompakt "Güncel Durum" — sidebar HUD ─────────────────────────────────────

export const IsletmeGuncelDurum = ({
  kart,
  tamamlanan,
  toplamIslem,
  bitenIslem,
}: {
  kart: KesfetKart;
  tamamlanan: Set<string>;
  toplamIslem: number;
  bitenIslem: number;
}) => {
  const { nakit, aktifTop, netKar } = useMemo(() => {
    const hesaplar = defterHesapla(kart, tamamlanan);
    const mizan = mizanUret(hesaplar);
    const nakit = mizan
      .filter((m) => m.kod.startsWith('10'))
      .reduce((t, m) => t + net(m), 0);
    const { aktifTop } = bilancoUret(hesaplar);
    const { netKar } = gelirTablosuUret(hesaplar);
    return { nakit, aktifTop, netKar };
  }, [kart, tamamlanan]);

  const satir = (etiket: string, deger: number, vurgu?: boolean) => (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12.5px] text-ink-mute">{etiket}</span>
      <span
        className={`font-mono text-[13px] tnum tabular-nums ${
          vurgu ? (deger < 0 ? 'text-danger font-semibold' : 'text-brand-deep font-semibold') : 'text-ink'
        }`}
      >
        {tl(deger)}
      </span>
    </div>
  );

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-lg bg-brand-soft text-brand-deep grid place-items-center">
          <Icon name="Calculator" size={14} />
        </span>
        <span className="font-display text-[14px] font-bold text-ink">Güncel Durum</span>
      </div>
      <div className="space-y-2">
        {satir('Nakit (Kasa + Banka)', nakit)}
        {satir('Toplam Varlık', aktifTop)}
        {satir(netKar < 0 ? 'Dönem Zararı' : 'Dönem Kârı', netKar, true)}
      </div>
      <div className="mt-3 pt-3 border-t border-line-soft flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-wide text-ink-quiet">
          İşlenen
        </span>
        <span className="font-mono text-[11px] text-ink-mute tnum">
          {bitenIslem}/{toplamIslem}
        </span>
      </div>
    </div>
  );
};

// ── Tam "Mali Tablolar" — Mizan · Gelir Tablosu · Bilanço ─────────────────────

const Baslik = ({ ikon, metin }: { ikon: string; metin: string }) => (
  <div className="flex items-center gap-2.5 mb-4">
    <span className="w-8 h-8 rounded-lg bg-brand-soft text-brand-deep grid place-items-center">
      <Icon name={ikon} size={15} />
    </span>
    <h3 className="font-display text-[18px] font-bold text-ink">{metin}</h3>
  </div>
);

export const IsletmeMaliTablolar = ({
  kart,
  tamamlanan,
}: {
  kart: KesfetKart;
  tamamlanan: Set<string>;
}) => {
  const { mizan, gelir, bilanco, mizanBorcTop, mizanAlacakTop, mizanBorcBak, mizanAlacakBak } =
    useMemo(() => {
      const hesaplar = defterHesapla(kart, tamamlanan);
      const mizan = mizanUret(hesaplar);
      return {
        mizan,
        gelir: gelirTablosuUret(hesaplar),
        bilanco: bilancoUret(hesaplar),
        mizanBorcTop: mizan.reduce((t, m) => t + m.borcToplam, 0),
        mizanAlacakTop: mizan.reduce((t, m) => t + m.alacakToplam, 0),
        mizanBorcBak: mizan.reduce((t, m) => t + m.borcBakiye, 0),
        mizanAlacakBak: mizan.reduce((t, m) => t + m.alacakBakiye, 0),
      };
    }, [kart, tamamlanan]);

  if (mizan.length === 0) {
    return (
      <div className="rounded-[18px] border border-line bg-surface px-6 py-12 text-center">
        <p className="text-[14px] text-ink-mute">
          Henüz kayıtlı işlem yok. Önceki adımlardaki işlemleri tamamladıkça mali tablolar burada
          otomatik oluşacak.
        </p>
      </div>
    );
  }

  const denk = Math.abs(bilanco.aktifTop - bilanco.pasifTop) < 0.01;

  return (
    <div className="flex flex-col gap-10">
      {/* Mizan */}
      <section>
        <Baslik ikon="ListChecks" metin="Mizan" />
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-[13px] min-w-[560px]">
            <thead>
              <tr className="bg-surface-2 text-ink-mute font-mono text-[10.5px] uppercase tracking-wide">
                <th className="text-left font-medium px-3 py-2">Hesap</th>
                <th className="text-right font-medium px-3 py-2">Borç Toplam</th>
                <th className="text-right font-medium px-3 py-2">Alacak Toplam</th>
                <th className="text-right font-medium px-3 py-2">Borç Bakiye</th>
                <th className="text-right font-medium px-3 py-2">Alacak Bakiye</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {mizan.map((m) => (
                <tr key={m.kod}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="font-mono text-ink-mute mr-2">{m.kod}</span>
                    <span className="text-ink">{m.ad}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tnum text-ink-soft">{tl(m.borcToplam)}</td>
                  <td className="px-3 py-2 text-right font-mono tnum text-ink-soft">{tl(m.alacakToplam)}</td>
                  <td className="px-3 py-2 text-right font-mono tnum text-ink">
                    {m.borcBakiye ? tl(m.borcBakiye) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tnum text-ink">
                    {m.alacakBakiye ? tl(m.alacakBakiye) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line-strong font-semibold">
                <td className="px-3 py-2 text-ink">Toplam</td>
                <td className="px-3 py-2 text-right font-mono tnum text-brand-deep">{tl(mizanBorcTop)}</td>
                <td className="px-3 py-2 text-right font-mono tnum text-brand-deep">{tl(mizanAlacakTop)}</td>
                <td className="px-3 py-2 text-right font-mono tnum text-brand-deep">{tl(mizanBorcBak)}</td>
                <td className="px-3 py-2 text-right font-mono tnum text-brand-deep">{tl(mizanAlacakBak)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Gelir Tablosu */}
      <section>
        <Baslik ikon="BarChart3" metin="Gelir Tablosu (özet)" />
        <div className="rounded-xl border border-line divide-y divide-line-soft">
          {gelir.gelirler.map((m) => (
            <div key={m.kod} className="flex items-baseline justify-between gap-3 px-4 py-2 text-[13px]">
              <span className="text-ink">
                <span className="font-mono text-ink-mute mr-2">{m.kod}</span>
                {m.ad}
              </span>
              <span className="font-mono tnum text-ink">{tl(-net(m))}</span>
            </div>
          ))}
          {gelir.giderler.map((m) => (
            <div key={m.kod} className="flex items-baseline justify-between gap-3 px-4 py-2 text-[13px]">
              <span className="text-ink">
                <span className="font-mono text-ink-mute mr-2">{m.kod}</span>
                {m.ad}
              </span>
              <span className="font-mono tnum text-danger">({tl(net(m))})</span>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-3 px-4 py-3 bg-surface-2">
            <span className="font-display font-bold text-ink">
              {gelir.netKar < 0 ? 'Dönem Net Zararı' : 'Dönem Net Kârı'}
            </span>
            <span
              className={`font-mono tnum font-bold ${
                gelir.netKar < 0 ? 'text-danger' : 'text-brand-deep'
              }`}
            >
              {tl(gelir.netKar)}
            </span>
          </div>
        </div>
      </section>

      {/* Bilanço */}
      <section>
        <Baslik ikon="Scale" metin="Bilanço" />
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Aktif */}
          <div className="rounded-xl border border-line">
            <div className="px-4 py-2 bg-surface-2 font-mono text-[10.5px] uppercase tracking-wide text-ink-mute">
              Aktif (Varlıklar)
            </div>
            <div className="divide-y divide-line-soft">
              {bilanco.aktif.filter((m) => Math.abs(net(m)) > 0.005).map((m) => (
                <div key={m.kod} className="flex items-baseline justify-between gap-3 px-4 py-2 text-[13px]">
                  <span className="text-ink">
                    <span className="font-mono text-ink-mute mr-2">{m.kod}</span>
                    {m.ad}
                  </span>
                  <span className="font-mono tnum text-ink">{tl(net(m))}</span>
                </div>
              ))}
            </div>
            <div className="flex items-baseline justify-between gap-3 px-4 py-2.5 border-t-2 border-line-strong font-semibold">
              <span className="text-ink">Aktif Toplam</span>
              <span className="font-mono tnum text-brand-deep">{tl(bilanco.aktifTop)}</span>
            </div>
          </div>

          {/* Pasif */}
          <div className="rounded-xl border border-line">
            <div className="px-4 py-2 bg-surface-2 font-mono text-[10.5px] uppercase tracking-wide text-ink-mute">
              Pasif (Kaynaklar)
            </div>
            <div className="divide-y divide-line-soft">
              {bilanco.pasif.filter((m) => Math.abs(net(m)) > 0.005).map((m) => (
                <div key={m.kod} className="flex items-baseline justify-between gap-3 px-4 py-2 text-[13px]">
                  <span className="text-ink">
                    <span className="font-mono text-ink-mute mr-2">{m.kod}</span>
                    {m.ad}
                  </span>
                  <span className="font-mono tnum text-ink">{tl(-net(m))}</span>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-3 px-4 py-2 text-[13px]">
                <span className="text-ink italic">
                  {bilanco.donemKari < 0 ? 'Dönem Net Zararı' : 'Dönem Net Kârı'}
                </span>
                <span className="font-mono tnum text-ink">{tl(bilanco.donemKari)}</span>
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-3 px-4 py-2.5 border-t-2 border-line-strong font-semibold">
              <span className="text-ink">Pasif Toplam</span>
              <span className="font-mono tnum text-brand-deep">{tl(bilanco.pasifTop)}</span>
            </div>
          </div>
        </div>

        <div
          className={`mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold ${
            denk ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
          }`}
        >
          <Icon name={denk ? 'CheckCircle2' : 'AlertCircle'} size={14} />
          {denk ? 'Bilanço denk (Aktif = Pasif)' : 'Bilanço denk değil — kayıtları kontrol et'}
        </div>
      </section>
    </div>
  );
};
