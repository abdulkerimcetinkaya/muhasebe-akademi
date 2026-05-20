// Özel BlockNote bloğu — Yevmiye Kaydı.
//
// Saklama formatı (props):
//   tarih:    "15.01.2025" (zorunlu)
//   satirlar: JSON stringify edilmiş YevmiyeSatir[]
//   aciklama: serbest metin (opsiyonel)
//
// Render iki modlu:
//   - Editör (admin paneli): form alanları, satır ekle/sil, hesap kodu
//     autocomplete (HESAP_PLANI'ndan), borç=alacak eşitlik uyarısı.
//   - Görüntüleyici (kullanıcı): klasik defter formatı — tire çizgisi içinde
//     tarih, borç satırları solda, alacaklar girintili, sağda hizalı tutar,
//     açıklama, alttan tire çizgisi.

import { createReactBlockSpec } from '@blocknote/react';
import { useState } from 'react';
import { HESAP_PLANI } from '../data/hesap-plani';

export type YevmiyeSatir = {
  tip: 'borc' | 'alacak';
  kod: string;
  ad: string;
  tutar: string; // "50000" veya "50000.00" — boş string = 0
};

const satirlariParse = (json: string): YevmiyeSatir[] => {
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr as YevmiyeSatir[];
  } catch {
    // sessizce yut — bozuk JSON varsa boş liste döner
  }
  return [];
};

const satirlariStringify = (satirlar: YevmiyeSatir[]) => JSON.stringify(satirlar);

const tutarSayi = (s: string): number => {
  if (!s) return 0;
  // 50.000,00 → 50000.00, 50000 → 50000
  const temiz = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(temiz);
  return Number.isFinite(n) ? n : 0;
};

const tutarBicim = (s: string): string => {
  const n = tutarSayi(s);
  if (n === 0 && !s) return '';
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const hesapAdiBul = (kod: string): string => {
  // Tam eşleşme önce
  const tam = HESAP_PLANI.find((h) => h.kod === kod);
  if (tam) return tam.ad;
  // Muavin kodu (örn: 100.001) → ana hesabı bul, adını dön
  const anaKod = kod.split('.')[0];
  const ana = HESAP_PLANI.find((h) => h.kod === anaKod);
  return ana ? ana.ad : '';
};

export const YevmiyeBlock = createReactBlockSpec(
  {
    type: 'yevmiye',
    propSchema: {
      tarih: { default: '' },
      satirlar: { default: '[]' },
      aciklama: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const editable = editor.isEditable;
      const tarih = block.props.tarih;
      const satirlar = satirlariParse(block.props.satirlar);
      const aciklama = block.props.aciklama;

      if (!editable) {
        return (
          <YevmiyeOkuyucu tarih={tarih} satirlar={satirlar} aciklama={aciklama} />
        );
      }

      return (
        <YevmiyeDuzenleyici
          tarih={tarih}
          satirlar={satirlar}
          aciklama={aciklama}
          onDegis={(yeni) => {
            editor.updateBlock(block, {
              props: {
                tarih: yeni.tarih,
                satirlar: satirlariStringify(yeni.satirlar),
                aciklama: yeni.aciklama,
              },
            });
          }}
        />
      );
    },
  },
);

// ---------- Görüntüleyici (klasik defter formatı) ----------

const YevmiyeOkuyucu = ({
  tarih,
  satirlar,
  aciklama,
}: {
  tarih: string;
  satirlar: YevmiyeSatir[];
  aciklama: string;
}) => {
  const borclar = satirlar.filter((s) => s.tip === 'borc');
  const alacaklar = satirlar.filter((s) => s.tip === 'alacak');

  return (
    <div className="bn-yevmiye-okur" contentEditable={false}>
      <div className="bn-yevmiye-baslik">
        <span className="bn-yevmiye-cizgi" />
        <span className="bn-yevmiye-tarih">{tarih || '—'}</span>
        <span className="bn-yevmiye-cizgi" />
      </div>

      {borclar.map((s, i) => (
        <div key={`b-${i}`} className="bn-yevmiye-satir bn-yevmiye-borc">
          <span className="bn-yevmiye-hesap">
            <span className="bn-yevmiye-kod">{s.kod}</span>{' '}
            <span className="bn-yevmiye-ad">{s.ad}</span>
          </span>
          <span className="bn-yevmiye-tutar">{tutarBicim(s.tutar)}</span>
          <span className="bn-yevmiye-tutar bn-yevmiye-tutar-bos" />
        </div>
      ))}

      {alacaklar.map((s, i) => (
        <div key={`a-${i}`} className="bn-yevmiye-satir bn-yevmiye-alacak">
          <span className="bn-yevmiye-hesap">
            <span className="bn-yevmiye-kod">{s.kod}</span>{' '}
            <span className="bn-yevmiye-ad">{s.ad}</span>
          </span>
          <span className="bn-yevmiye-tutar bn-yevmiye-tutar-bos" />
          <span className="bn-yevmiye-tutar">{tutarBicim(s.tutar)}</span>
        </div>
      ))}

      <div className="bn-yevmiye-alt">
        <span className="bn-yevmiye-cizgi-uzun" />
      </div>

      {aciklama && <div className="bn-yevmiye-aciklama">{aciklama}</div>}
    </div>
  );
};

// ---------- Düzenleyici (admin form) ----------

const YevmiyeDuzenleyici = ({
  tarih,
  satirlar,
  aciklama,
  onDegis,
}: {
  tarih: string;
  satirlar: YevmiyeSatir[];
  aciklama: string;
  onDegis: (yeni: {
    tarih: string;
    satirlar: YevmiyeSatir[];
    aciklama: string;
  }) => void;
}) => {
  const borcToplam = satirlar
    .filter((s) => s.tip === 'borc')
    .reduce((t, s) => t + tutarSayi(s.tutar), 0);
  const alacakToplam = satirlar
    .filter((s) => s.tip === 'alacak')
    .reduce((t, s) => t + tutarSayi(s.tutar), 0);
  const dengeli = borcToplam === alacakToplam && borcToplam > 0;

  const setSatir = (i: number, yeni: YevmiyeSatir) => {
    const kopya = [...satirlar];
    kopya[i] = yeni;
    onDegis({ tarih, satirlar: kopya, aciklama });
  };

  const silSatir = (i: number) => {
    onDegis({
      tarih,
      satirlar: satirlar.filter((_, idx) => idx !== i),
      aciklama,
    });
  };

  const ekleSatir = (tip: 'borc' | 'alacak') => {
    onDegis({
      tarih,
      satirlar: [...satirlar, { tip, kod: '', ad: '', tutar: '' }],
      aciklama,
    });
  };

  return (
    <div className="bn-yevmiye-duz" contentEditable={false}>
      <div className="bn-yevmiye-duz-ust">
        <label className="bn-yevmiye-etk">Tarih</label>
        <input
          type="text"
          value={tarih}
          onChange={(e) => onDegis({ tarih: e.target.value, satirlar, aciklama })}
          placeholder="15.01.2025"
          className="bn-yevmiye-tarih-input"
        />
      </div>

      <div className="bn-yevmiye-duz-satirlar">
        {satirlar.length === 0 && (
          <div className="bn-yevmiye-bos">
            Henüz satır yok. Aşağıdan borç ya da alacak satırı ekle.
          </div>
        )}
        {satirlar.map((s, i) => (
          <SatirInput
            key={i}
            satir={s}
            onDegis={(yeni) => setSatir(i, yeni)}
            onSil={() => silSatir(i)}
          />
        ))}
      </div>

      <div className="bn-yevmiye-duz-butonlar">
        <button
          type="button"
          onClick={() => ekleSatir('borc')}
          className="bn-yevmiye-buton"
        >
          + Borç satırı
        </button>
        <button
          type="button"
          onClick={() => ekleSatir('alacak')}
          className="bn-yevmiye-buton"
        >
          + Alacak satırı
        </button>
        <div className="bn-yevmiye-toplam">
          <span>Borç {borcToplam.toLocaleString('tr-TR')}</span>
          <span className="bn-yevmiye-toplam-ayrac">·</span>
          <span>Alacak {alacakToplam.toLocaleString('tr-TR')}</span>
          {satirlar.length > 0 && (
            <span
              className={
                dengeli
                  ? 'bn-yevmiye-denge bn-yevmiye-denge-ok'
                  : 'bn-yevmiye-denge bn-yevmiye-denge-yok'
              }
            >
              {dengeli ? 'Eşit' : 'Eşit değil'}
            </span>
          )}
        </div>
      </div>

      <div className="bn-yevmiye-duz-aciklama">
        <input
          type="text"
          value={aciklama}
          onChange={(e) =>
            onDegis({ tarih, satirlar, aciklama: e.target.value })
          }
          placeholder="Açıklama (opsiyonel) — örn: Şahıs işletmesinin nakit sermaye konulması"
          className="bn-yevmiye-aciklama-input"
        />
      </div>
    </div>
  );
};

const SatirInput = ({
  satir,
  onDegis,
  onSil,
}: {
  satir: YevmiyeSatir;
  onDegis: (yeni: YevmiyeSatir) => void;
  onSil: () => void;
}) => {
  const [adManuel, setAdManuel] = useState(false);

  const kodDegisti = (yeniKod: string) => {
    const otomatikAd = hesapAdiBul(yeniKod);
    onDegis({
      ...satir,
      kod: yeniKod,
      // Kullanıcı adı manuel düzenlemediyse otomatik doldur
      ad: adManuel ? satir.ad : otomatikAd || satir.ad,
    });
  };

  return (
    <div className={`bn-yevmiye-duz-satir bn-yevmiye-duz-${satir.tip}`}>
      <span className="bn-yevmiye-duz-etiket">
        {satir.tip === 'borc' ? 'B' : 'A'}
      </span>
      <input
        type="text"
        value={satir.kod}
        onChange={(e) => kodDegisti(e.target.value)}
        placeholder="100"
        list="hesap-kod-listesi"
        className="bn-yevmiye-duz-kod"
      />
      <input
        type="text"
        value={satir.ad}
        onChange={(e) => {
          setAdManuel(true);
          onDegis({ ...satir, ad: e.target.value });
        }}
        placeholder="Hesap adı"
        className="bn-yevmiye-duz-ad"
      />
      <input
        type="text"
        value={satir.tutar}
        onChange={(e) => onDegis({ ...satir, tutar: e.target.value })}
        placeholder="50000"
        className="bn-yevmiye-duz-tutar"
        inputMode="decimal"
      />
      <button
        type="button"
        onClick={onSil}
        className="bn-yevmiye-duz-sil"
        title="Satırı sil"
      >
        ×
      </button>
    </div>
  );
};

// Hesap kodu input'unda autocomplete için bir kez render edilen datalist.
// IcerikEditor mount edildiğinde sayfaya eklenir.
export const HesapKodDataList = () => (
  <datalist id="hesap-kod-listesi">
    {HESAP_PLANI.map((h) => (
      <option key={h.kod} value={h.kod}>
        {h.ad}
      </option>
    ))}
  </datalist>
);
