import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { KontrolSoruView } from '../lib/kontrol-block';
import { KayitSoruView } from '../lib/kayit-block';

// İçerikten süzülen interaktif soru blokları (kontrol / kayit).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TestSoru = { type: 'kontrol' | 'kayit'; props: any };

// Skora göre teşvik edici başlık/mesaj/renk — asla kırıcı değil.
const geriBildirim = (dogru: number, toplam: number) => {
  const oran = toplam > 0 ? dogru / toplam : 0;
  if (oran === 1) return { baslik: 'Kusursuz!', mesaj: 'Bu bölümü tam kavramışsın. Harikasın.', renk: 'basari' };
  if (oran >= 0.75) return { baslik: 'Harika iş!', mesaj: 'Neredeyse hepsi tamam — çok iyisin.', renk: 'basari' };
  if (oran >= 0.5) return { baslik: 'Güzel gidiyor!', mesaj: 'Birkaç noktayı tekrar edersen tam oturur.', renk: 'mavi' };
  if (oran > 0) return { baslik: 'İyi başlangıç!', mesaj: 'Dersi bir daha göz gezdir, sonra tekrar dene.', renk: 'bakir' };
  return { baslik: 'Denemeye devam!', mesaj: 'Acelesi yok — konuyu tekrarla, birlikte çözeceğiz.', renk: 'bakir' };
};

/**
 * Ders testini modal olarak çalıştırır: bulanık arka plan, tek tek soru,
 * sağ/sol ok ile SERBEST geçiş (doğru çözme zorunlu değil). En sonda
 * "kaç doğru" sonuç ekranı — teşvik edici. Bitir → ders tamamlanır.
 */
export const KesfetTestModal = ({
  sorular,
  baslik,
  onKapat,
  onTamamla,
}: {
  sorular: TestSoru[];
  baslik?: string;
  onKapat: () => void;
  onTamamla: () => void;
}) => {
  const n = sorular.length;
  const [i, setI] = useState(0);
  // Her sorunun durumu: true=doğru, false=yanlış, null=henüz cevaplanmadı.
  const [durum, setDurum] = useState<(boolean | null)[]>(() => sorular.map(() => null));
  const [sonucEkrani, setSonucEkrani] = useState(false);
  // "Tekrar dene" → tüm soru bileşenlerini remount etmek için sayaç.
  const [deneme, setDeneme] = useState(0);
  // Sonuç halkasının dolum animasyonu için.
  const [ringHazir, setRingHazir] = useState(false);

  const dogruSayi = durum.filter((d) => d === true).length;

  const gitDurum = (idx: number, d: boolean | null) =>
    setDurum((s) => (s[idx] === d ? s : s.map((x, j) => (j === idx ? d : x))));

  const git = (d: number) => setI((x) => Math.min(n - 1, Math.max(0, x + d)));

  const sonucaGec = () => {
    setSonucEkrani(true);
    setRingHazir(false);
  };
  const tekrarDene = () => {
    setDurum(sorular.map(() => null));
    setI(0);
    setSonucEkrani(false);
    setDeneme((d) => d + 1);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const hedef = e.target as HTMLElement | null;
      const yaziyor =
        !!hedef && (hedef.tagName === 'INPUT' || hedef.tagName === 'TEXTAREA' || hedef.isContentEditable);
      if (e.key === 'Escape') onKapat();
      else if (sonucEkrani || yaziyor) return;
      else if (e.key === 'ArrowRight') git(1);
      else if (e.key === 'ArrowLeft') git(-1);
    };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, sonucEkrani]);

  // Sonuç ekranı açılınca halkayı bir tick sonra doldur (animasyon).
  useEffect(() => {
    if (!sonucEkrani) return;
    const t = window.setTimeout(() => setRingHazir(true), 60);
    return () => window.clearTimeout(t);
  }, [sonucEkrani]);

  const bg = geriBildirim(dogruSayi, n);
  const C = 326.73; // 2πr, r=52
  const oran = n > 0 ? dogruSayi / n : 0;

  return (
    <div className="kt-overlay" onClick={onKapat}>
      <div className="kt-panel" onClick={(e) => e.stopPropagation()}>
        <div className="kt-ust">
          <div className="kt-ust-sol">
            <span className="kt-etiket">Test</span>
            {baslik && <span className="kt-baslik">{baslik}</span>}
          </div>
          {!sonucEkrani && (
            <span className="kt-ilerleme tnum">
              {i + 1} / {n}
            </span>
          )}
          <button className="kt-kapat" onClick={onKapat} aria-label="Kapat">
            <Icon name="X" size={18} />
          </button>
        </div>

        {sonucEkrani ? (
          // ---------- Sonuç ekranı ----------
          <div className={`kt-sonuc kt-sonuc-${bg.renk}`}>
            <div className="kt-sonuc-ring">
              <svg viewBox="0 0 120 120" width="150" height="150">
                <circle className="kt-ring-arka" cx="60" cy="60" r="52" />
                <circle
                  className="kt-ring-on"
                  cx="60"
                  cy="60"
                  r="52"
                  style={{ strokeDasharray: C, strokeDashoffset: ringHazir ? C * (1 - oran) : C }}
                />
              </svg>
              <div className="kt-sonuc-sayi">
                <span className="kt-sonuc-dogru tnum">{dogruSayi}</span>
                <span className="kt-sonuc-toplam tnum">/ {n}</span>
              </div>
            </div>

            <div className="kt-sonuc-baslik">{bg.baslik}</div>
            <div className="kt-sonuc-mesaj">{bg.mesaj}</div>

            <div className="kt-sonuc-recap">
              {durum.map((d, j) => (
                <span key={j} className={`kt-recap-nokta ${d === true ? 'dogru' : ''}`}>
                  {d === true ? <Icon name="Check" size={13} /> : j + 1}
                </span>
              ))}
            </div>

            <div className="kt-sonuc-alt">
              <button className="kt-tekrar-btn" onClick={tekrarDene}>
                <Icon name="RotateCcw" size={16} />
                Tekrar Dene
              </button>
              <button className="kt-bitir" onClick={onTamamla}>
                Bitir
                <Icon name="Check" size={17} />
              </button>
            </div>
          </div>
        ) : (
          // ---------- Soru akışı ----------
          <>
            <div className="kt-govde">
              {sorular.map((s, idx) => (
                <div key={`${idx}-${deneme}`} style={{ display: idx === i ? 'block' : 'none' }}>
                  {s.type === 'kontrol' ? (
                    <KontrolSoruView {...s.props} onDurum={(d: boolean | null) => gitDurum(idx, d)} />
                  ) : s.type === 'kayit' ? (
                    <KayitSoruView {...s.props} onDurum={(d: boolean | null) => gitDurum(idx, d)} />
                  ) : null}
                </div>
              ))}
            </div>

            <div className="kt-alt">
              <button className="kt-ok" disabled={i === 0} onClick={() => git(-1)}>
                <Icon name="ArrowLeft" size={17} />
                Önceki
              </button>
              <div className="kt-noktalar">
                {sorular.map((_, j) => (
                  <button
                    key={j}
                    className={`kt-nokta ${j === i ? 'aktif' : ''} ${durum[j] === true ? 'gecti' : ''}`}
                    onClick={() => setI(j)}
                    aria-label={`Soru ${j + 1}`}
                  />
                ))}
              </div>
              {i === n - 1 ? (
                <button className="kt-bitir" onClick={sonucaGec}>
                  Sonucu Gör
                  <Icon name="ArrowRight" size={17} />
                </button>
              ) : (
                <button className="kt-ok kt-ileri" onClick={() => git(1)}>
                  Sonraki
                  <Icon name="ArrowRight" size={17} />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
