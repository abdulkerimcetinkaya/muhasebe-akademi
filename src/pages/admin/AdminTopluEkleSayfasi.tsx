import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { Icon } from '../../components/Icon';
import { supabase } from '../../lib/supabase';
import type { SoruDurum, Zorluk } from '../../lib/database.types';

interface CozumGiris {
  kod: string;
  borc: number;
  alacak: number;
}

interface SoruGiris {
  unite_id: string;
  baslik: string;
  zorluk: Zorluk;
  senaryo: string;
  ipucu?: string;
  aciklama?: string;
  durum?: SoruDurum;
  kaynak?: string;
  cozumler: CozumGiris[];
}

interface DogrulanmisSatir {
  veri: SoruGiris;
  yeniId: string;
  hatalar: string[];
}

const ID_KARAKTERLER = 'abcdefghijkmnpqrstuvwxyz23456789';
const idUret = (): string => {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < 8; i++) s += ID_KARAKTERLER[buf[i] % ID_KARAKTERLER.length];
  return s;
};

const ORNEK_JSON = `[
  {
    "unite_id": "mal",
    "baslik": "Peşin Mal Satışı",
    "zorluk": "kolay",
    "senaryo": "İşletme 10.000 TL'lik malı %20 KDV ile peşin satmıştır.",
    "ipucu": "Kasa hesabı brüt tutarı alır. Yurtiçi satışlar hasılat hesabıdır.",
    "aciklama": "Peşin satışta kasa borçlanır; yurtiçi satışlar ve KDV alacaklanır.",
    "durum": "taslak",
    "kaynak": "ai",
    "cozumler": [
      { "kod": "100.001", "borc": 12000, "alacak": 0 },
      { "kod": "600.001", "borc": 0, "alacak": 10000 },
      { "kod": "391.001", "borc": 0, "alacak": 2000 }
    ]
  }
]`;

export const AdminTopluEkleSayfasi = () => {
  const nav = useNavigate();
  const [metin, setMetin] = useState('');
  const [satirlar, setSatirlar] = useState<DogrulanmisSatir[] | null>(null);
  const [parseHatasi, setParseHatasi] = useState<string | null>(null);
  const [uniteIdler, setUniteIdler] = useState<Set<string>>(new Set());
  const [hesapKodlari, setHesapKodlari] = useState<Set<string>>(new Set());
  const [ekleniyor, setEkleniyor] = useState(false);
  const [sonuc, setSonuc] = useState<{ basarili: number; hatali: number } | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('unites').select('id'),
      // Muavin kodları kabul ediyoruz (cozumler.kod -> muavin_hesaplar FK)
      supabase.from('muavin_hesaplar').select('kod').eq('aktif', true),
    ]).then(([uR, mR]) => {
      setUniteIdler(new Set((uR.data ?? []).map((u) => u.id)));
      setHesapKodlari(new Set((mR.data ?? []).map((m) => m.kod)));
    });
  }, []);

  const dogrulaSatir = (s: unknown): { veri: SoruGiris | null; hatalar: string[] } => {
    const hatalar: string[] = [];
    if (!s || typeof s !== 'object') {
      hatalar.push('Obje değil.');
      return { veri: null, hatalar };
    }
    const o = s as Record<string, unknown>;

    if (typeof o.unite_id !== 'string' || !o.unite_id) hatalar.push('unite_id yok.');
    else if (!uniteIdler.has(o.unite_id)) hatalar.push(`unite_id bulunamadı: ${o.unite_id}`);

    if (typeof o.baslik !== 'string' || !o.baslik.trim()) hatalar.push('baslik yok/boş.');
    if (typeof o.senaryo !== 'string' || !o.senaryo.trim()) hatalar.push('senaryo yok/boş.');

    const zorluk = o.zorluk;
    if (zorluk !== 'kolay' && zorluk !== 'orta' && zorluk !== 'zor') {
      hatalar.push(`zorluk geçersiz: ${String(zorluk)}`);
    }

    const durum = o.durum ?? 'taslak';
    if (!['taslak', 'inceleme', 'onayli', 'arsiv'].includes(durum as string)) {
      hatalar.push(`durum geçersiz: ${String(durum)}`);
    }

    if (!Array.isArray(o.cozumler) || o.cozumler.length < 2) {
      hatalar.push('En az 2 çözüm satırı gerekli.');
    } else {
      let toplamBorc = 0;
      let toplamAlacak = 0;
      o.cozumler.forEach((c, i) => {
        if (!c || typeof c !== 'object') {
          hatalar.push(`cozum[${i}]: obje değil.`);
          return;
        }
        const cc = c as Record<string, unknown>;
        if (typeof cc.kod !== 'string' || !cc.kod) {
          hatalar.push(`cozum[${i}]: kod yok.`);
          return;
        }
        const muavinFormat = /^[0-9]{3}(\.[0-9]+)+$/;
        if (!muavinFormat.test(cc.kod)) {
          hatalar.push(`cozum[${i}]: "${cc.kod}" ana hesap — muavin kullan (${cc.kod}.001 gibi).`);
        } else if (!hesapKodlari.has(cc.kod)) {
          hatalar.push(`cozum[${i}]: tanımsız muavin ${cc.kod} — önce muavin tablosuna ekle.`);
        }
        const borc = Number(cc.borc) || 0;
        const alacak = Number(cc.alacak) || 0;
        if (borc > 0 && alacak > 0) hatalar.push(`cozum[${i}]: borç ve alacak aynı anda olamaz.`);
        if (borc === 0 && alacak === 0) hatalar.push(`cozum[${i}]: borç veya alacak olmalı.`);
        toplamBorc += borc;
        toplamAlacak += alacak;
      });
      if (Math.abs(toplamBorc - toplamAlacak) > 0.01) {
        hatalar.push(`Dengeli değil: borç ${toplamBorc}, alacak ${toplamAlacak}`);
      }
    }

    if (hatalar.length > 0) return { veri: null, hatalar };

    return {
      veri: {
        unite_id: o.unite_id as string,
        baslik: (o.baslik as string).trim(),
        zorluk: zorluk as Zorluk,
        senaryo: (o.senaryo as string).trim(),
        ipucu: typeof o.ipucu === 'string' ? o.ipucu.trim() : undefined,
        aciklama: typeof o.aciklama === 'string' ? o.aciklama.trim() : undefined,
        durum: durum as SoruDurum,
        kaynak: typeof o.kaynak === 'string' ? o.kaynak : 'manuel',
        cozumler: (o.cozumler as unknown[]).map((c) => {
          const cc = c as Record<string, unknown>;
          return {
            kod: cc.kod as string,
            borc: Number(cc.borc) || 0,
            alacak: Number(cc.alacak) || 0,
          };
        }),
      },
      hatalar: [],
    };
  };

  const dogrula = () => {
    setParseHatasi(null);
    setSonuc(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(metin);
    } catch (e) {
      setParseHatasi('Geçersiz JSON: ' + (e instanceof Error ? e.message : String(e)));
      setSatirlar(null);
      return;
    }
    if (!Array.isArray(parsed)) {
      setParseHatasi('JSON bir dizi (array) olmalı. [{ ... }, { ... }]');
      setSatirlar(null);
      return;
    }
    const sonuclar = parsed.map((s): DogrulanmisSatir => {
      const { veri, hatalar } = dogrulaSatir(s);
      return {
        veri: (veri ?? (s as SoruGiris)),
        yeniId: idUret(),
        hatalar,
      };
    });
    setSatirlar(sonuclar);
  };

  const gecerliSayisi = useMemo(
    () => (satirlar ?? []).filter((s) => s.hatalar.length === 0).length,
    [satirlar],
  );

  const iceAktar = async () => {
    if (!satirlar) return;
    const gecerli = satirlar.filter((s) => s.hatalar.length === 0);
    if (gecerli.length === 0) return;
    setEkleniyor(true);
    const simdi = new Date().toISOString();

    const soruSatirlari = gecerli.map((s) => ({
      id: s.yeniId,
      unite_id: s.veri.unite_id,
      konu_id: null,
      baslik: s.veri.baslik,
      zorluk: s.veri.zorluk,
      senaryo: s.veri.senaryo,
      ipucu: s.veri.ipucu || null,
      aciklama: s.veri.aciklama || null,
      durum: s.veri.durum ?? 'taslak',
      kaynak: s.veri.kaynak ?? 'manuel',
      yayinlanma_tarihi: (s.veri.durum ?? 'taslak') === 'onayli' ? simdi : null,
    }));

    const { error: soruErr } = await supabase.from('sorular').insert(soruSatirlari);
    if (soruErr) {
      setEkleniyor(false);
      alert('Sorular eklenemedi: ' + soruErr.message);
      return;
    }

    const cozumSatirlari = gecerli.flatMap((s) =>
      s.veri.cozumler.map((c, i) => ({
        soru_id: s.yeniId,
        sira: i + 1,
        kod: c.kod,
        borc: c.borc,
        alacak: c.alacak,
      })),
    );
    const { error: cozErr } = await supabase.from('cozumler').insert(cozumSatirlari);
    if (cozErr) {
      // rollback: eklenen soruları sil
      await supabase.from('sorular').delete().in(
        'id',
        gecerli.map((s) => s.yeniId),
      );
      setEkleniyor(false);
      alert('Çözümler eklenemedi (sorular geri alındı): ' + cozErr.message);
      return;
    }

    setEkleniyor(false);
    setSonuc({ basarili: gecerli.length, hatali: (satirlar?.length ?? 0) - gecerli.length });
    setMetin('');
    setSatirlar(null);
  };

  const ornekYukle = () => {
    setMetin(ORNEK_JSON);
    setSonuc(null);
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
      <AdminYanMenu />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Toplu Soru Ekle</h1>
            <p className="text-sm text-ink-soft font-medium">
              JSON olarak birden çok soruyu tek seferde ekle. ID'ler otomatik üretilir.
            </p>
          </div>
          <button
            onClick={ornekYukle}
            className="text-sm text-ink-soft hover:text-ink font-semibold flex items-center gap-2"
          >
            <Icon name="FileCode" size={14} />
            Örnek yükle
          </button>
        </div>

        {sonuc && (
          <div className="flex items-start gap-2 p-4 bg-success-soft border border-success-soft rounded-lg text-sm text-success font-medium mb-4">
            <Icon name="CheckCircle2" size={16} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong>{sonuc.basarili}</strong> soru başarıyla eklendi.
              {sonuc.hatali > 0 && ` ${sonuc.hatali} satır hatalıydı, atlandı.`}
              <button
                onClick={() => nav('/admin/sorular')}
                className="ml-3 underline font-bold"
              >
                Listeye git →
              </button>
            </div>
          </div>
        )}

        <textarea
          value={metin}
          onChange={(e) => setMetin(e.target.value)}
          rows={14}
          placeholder='[{"unite_id": "...", "baslik": "...", "zorluk": "kolay", "senaryo": "...", "cozumler": [...]}]'
          className="w-full px-3 py-2 bg-bg-tint border border-line-strong focus:border-ink focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/30 outline-none text-xs rounded-lg font-mono mb-3"
        />

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={dogrula}
            disabled={!metin.trim()}
            className="flex items-center gap-2 px-4 py-2 border border-line-strong hover:border-ink rounded-lg text-sm font-bold disabled:opacity-50 transition"
          >
            <Icon name="ShieldCheck" size={14} />
            Doğrula
          </button>
          {satirlar && gecerliSayisi > 0 && (
            <button
              onClick={iceAktar}
              disabled={ekleniyor}
              className="flex items-center gap-2 px-5 py-2 bg-ink text-bg rounded-lg text-sm font-bold hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50"
            >
              {ekleniyor && <Icon name="Loader2" size={14} className="animate-spin" />}
              İçe Aktar ({gecerliSayisi})
            </button>
          )}
        </div>

        {parseHatasi && (
          <div className="flex items-start gap-2 p-3 bg-danger-soft border border-danger-soft rounded-lg text-sm text-danger font-medium mb-4">
            <Icon name="AlertCircle" size={16} className="flex-shrink-0 mt-0.5" />
            <span>{parseHatasi}</span>
          </div>
        )}

        {satirlar && (
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-bg-tint border-b border-line text-xs font-bold">
              {gecerliSayisi} geçerli / {satirlar.length} toplam
            </div>
            <table className="w-full text-sm">
              <thead className="bg-bg-tint border-b border-line">
                <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
                  <th className="px-4 py-2 w-10">#</th>
                  <th className="px-4 py-2">Başlık</th>
                  <th className="px-4 py-2">İşletme</th>
                  <th className="px-4 py-2">Durum</th>
                </tr>
              </thead>
              <tbody>
                {satirlar.map((s, i) => (
                  <tr
                    key={i}
                    className="border-b border-line-soft last:border-0 align-top"
                  >
                    <td className="px-4 py-2 text-ink-quiet font-mono text-xs pt-3">{i + 1}</td>
                    <td className="px-4 py-2">
                      <div className="font-semibold">{s.veri.baslik || '—'}</div>
                      <div className="text-xs text-ink-mute font-mono mt-0.5">{s.yeniId}</div>
                    </td>
                    <td className="px-4 py-2 text-ink-soft text-xs pt-3">
                      {s.veri.unite_id || '—'}
                    </td>
                    <td className="px-4 py-2 pt-3">
                      {s.hatalar.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-success dark:text-success">
                          <Icon name="CheckCircle2" size={12} />
                          Geçerli
                        </span>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-danger dark:text-danger mb-1">
                            <Icon name="AlertCircle" size={12} />
                            Hatalı
                          </span>
                          <ul className="text-xs text-danger dark:text-danger list-disc ml-4 space-y-0.5">
                            {s.hatalar.map((h, j) => (
                              <li key={j}>{h}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
};
