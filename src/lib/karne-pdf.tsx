// MuhasebeAkademi Karne — A4 PDF, CV-andıran hibrit editorial.
// Profil sayfasındaki "Karneyi PDF indir" butonu bu modülü dynamic import'la
// yükler — @react-pdf/renderer ~600KB initial bundle'a girmesin diye.
//
// Türkçe karakter desteği:
// - Roboto TTF (public/fonts/, latin-ext) — body ve mono için.
// - Fraunces 900 italic/normal WOFF2 (public/fonts/, @fontsource'tan kopya) —
//   display moment (kullanıcı adı, key sayılar). Fraunces 2024+ build'i
//   Türkçe alfabe (ş ı ğ ü ö ç) ve dotless ı (U+0131) destekliyor.
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { ROZETLER } from '../data/rozetler';
import { kisiselRekorlar } from './profil-rekorlar';
import { uniteYetkinlikleri, modulYetkinlikleri } from './yetkinlik';
import type { Ilerleme, Istatistik, Unite } from '../types';

const FONT_BASE = `${window.location.origin}/fonts`;

Font.register({
  family: 'Roboto',
  fonts: [
    { src: `${FONT_BASE}/Roboto-Regular.ttf`, fontWeight: 400 },
    { src: `${FONT_BASE}/Roboto-Medium.ttf`, fontWeight: 500 },
    { src: `${FONT_BASE}/Roboto-Bold.ttf`, fontWeight: 700 },
    { src: `${FONT_BASE}/Roboto-Black.ttf`, fontWeight: 900 },
  ],
});

Font.register({
  family: 'Fraunces',
  fonts: [
    { src: `${FONT_BASE}/Fraunces-DisplayBlack.woff2`, fontWeight: 900, fontStyle: 'normal' },
    { src: `${FONT_BASE}/Fraunces-DisplayItalic.woff2`, fontWeight: 900, fontStyle: 'italic' },
  ],
});

const C = {
  ink: '#0f172a',
  inkSoft: '#475569',
  inkMute: '#94a3b8',
  bg: '#ffffff',
  surface: '#f8fafc',
  line: '#e2e8f0',
  // Copper trio — marka aksenti
  copper: '#b56b3e',
  copperDeep: '#8a4a23',
  copperSoft: '#f5e6d3',
  copperMid: '#dca47a',
} as const;

const s = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    backgroundColor: C.bg,
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 36,
    color: C.ink,
    fontSize: 10,
    lineHeight: 1.4,
  },

  // ─── BAND 1 — Name Plate ──────────────────────────────────────────
  namePlate: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: C.ink,
    marginBottom: 16,
  },
  brandStrip: {
    fontSize: 7,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: C.inkMute,
    fontWeight: 700,
    marginBottom: 6,
  },
  nameDisplay: {
    fontFamily: 'Fraunces',
    fontStyle: 'italic',
    fontWeight: 900,
    fontSize: 36,
    color: C.ink,
    lineHeight: 1.05,
    letterSpacing: -0.5,
  },
  nameContext: {
    fontSize: 9.5,
    color: C.inkSoft,
    fontWeight: 500,
    marginTop: 6,
    lineHeight: 1.3,
  },
  nameMeta: { flex: 1 },
  dateBlock: { alignItems: 'flex-end', minWidth: 130 },
  dateLabel: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.copper,
    fontWeight: 700,
    marginBottom: 3,
  },
  dateValue: {
    fontFamily: 'Roboto',
    fontSize: 10,
    color: C.ink,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  karneIdLabel: {
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.inkMute,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 2,
  },
  karneIdValue: {
    fontFamily: 'Roboto',
    fontSize: 8.5,
    color: C.ink,
    fontWeight: 700,
    letterSpacing: 0.6,
  },

  // ─── Section header (CV-style) ─────────────────────────────────────
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  sectionLabel: {
    fontSize: 8,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: C.ink,
    fontWeight: 700,
  },
  sectionLabelExtra: {
    marginLeft: 'auto',
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.inkMute,
    fontWeight: 700,
  },
  sectionRule: {
    height: 0.5,
    backgroundColor: C.line,
    marginBottom: 9,
  },
  bandGap: { marginBottom: 14 },

  // ─── BAND 2 — Profil özet (key stats) ─────────────────────────────
  statRow: { flexDirection: 'row' },
  statCol: {
    flex: 1,
    paddingHorizontal: 8,
    borderLeftWidth: 0.5,
    borderLeftColor: C.line,
  },
  statColFirst: { borderLeftWidth: 0, paddingLeft: 0 },
  statLabel: {
    fontSize: 7,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.inkMute,
    fontWeight: 700,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'Fraunces',
    fontWeight: 900,
    fontSize: 28,
    color: C.ink,
    lineHeight: 1,
    letterSpacing: -0.5,
  },
  statContext: {
    fontFamily: 'Roboto',
    fontSize: 8,
    color: C.copper,
    fontWeight: 500,
    marginTop: 4,
  },

  // ─── BAND 3 — İki sütun (yetkinlik + heatmap) ─────────────────────
  twoCol: { flexDirection: 'row', gap: 18 },
  colHalf: { flex: 1 },

  // Yetkinlik bar
  yetkinlikRow: { marginBottom: 8 },
  yetkinlikLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  yetkinlikAd: { flex: 1, fontSize: 10, color: C.ink, fontWeight: 500 },
  yetkinlikYuzde: {
    fontFamily: 'Fraunces',
    fontSize: 14,
    fontWeight: 900,
    color: C.copperDeep,
    letterSpacing: -0.3,
  },
  yetkinlikBarBg: {
    height: 8,
    backgroundColor: C.line,
    borderRadius: 1,
    overflow: 'hidden',
  },
  yetkinlikBarFill: { height: '100%', backgroundColor: C.copper },
  yetkinlikSub: {
    fontFamily: 'Roboto',
    fontSize: 7.5,
    color: C.inkMute,
    fontWeight: 500,
    marginTop: 3,
    letterSpacing: 0.5,
  },

  // Heatmap
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  heatCell: {
    width: 12,
    height: 12,
    borderRadius: 1,
  },
  heatLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  heatLegendText: {
    fontSize: 7,
    color: C.inkMute,
    letterSpacing: 0.5,
    fontWeight: 500,
  },

  // ─── BAND 4 — Modül haritası ──────────────────────────────────────
  modulGroup: { marginBottom: 8 },
  modulGroupHead: {
    fontFamily: 'Roboto',
    fontSize: 9.5,
    fontWeight: 700,
    color: C.copperDeep,
    marginBottom: 4,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  modulRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    borderBottomWidth: 0.4,
    borderBottomColor: C.line,
  },
  modulAd: { fontSize: 9.5, color: C.ink, fontWeight: 500 },
  modulAdDim: { fontSize: 9.5, color: C.inkMute, fontWeight: 500 },
  modulBarBg: {
    height: 4,
    backgroundColor: C.line,
    borderRadius: 1,
    overflow: 'hidden',
  },
  modulBarFill: { height: '100%', backgroundColor: C.copper },
  modulSayi: {
    fontFamily: 'Roboto',
    fontSize: 8.5,
    color: C.inkSoft,
    fontWeight: 700,
    letterSpacing: 0.3,
    textAlign: 'right',
  },
  modulYok: { fontSize: 9, color: C.inkMute, paddingVertical: 2 },

  // ─── BAND 5 — Rozetler + Rekorlar ─────────────────────────────────
  rozetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  rozetChip: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: C.copperSoft,
    borderLeftWidth: 2,
    borderLeftColor: C.copper,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    minWidth: 78,
  },
  rozetChipDim: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: C.bg,
    borderWidth: 0.5,
    borderColor: C.line,
    borderRadius: 4,
    minWidth: 78,
  },
  rozetText: { fontSize: 8.5, fontWeight: 700, color: C.copperDeep, letterSpacing: 0.2 },
  rozetTextDim: { fontSize: 8.5, fontWeight: 500, color: C.inkMute, letterSpacing: 0.2 },

  rekorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rekorBox: {
    width: '47%',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderLeftWidth: 2,
    borderLeftColor: C.line,
  },
  rekorEt: {
    fontSize: 7,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: C.inkMute,
    fontWeight: 700,
    marginBottom: 3,
  },
  rekorVal: {
    fontFamily: 'Fraunces',
    fontSize: 18,
    fontWeight: 900,
    color: C.ink,
    lineHeight: 1,
    letterSpacing: -0.3,
  },
  rekorAlt: { fontSize: 7.5, color: C.inkSoft, marginTop: 3, fontWeight: 500 },

  // ─── BAND 6 — Doğrulama footer ────────────────────────────────────
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  footerText: { flex: 1 },
  footerMain: {
    fontSize: 9,
    color: C.ink,
    fontWeight: 500,
    marginBottom: 3,
    lineHeight: 1.4,
  },
  footerSub: {
    fontSize: 7.5,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: C.copper,
    fontWeight: 700,
  },
  qrBlock: { alignItems: 'flex-end' },
  qrImg: { width: 56, height: 56 },
  qrUrl: {
    fontFamily: 'Roboto',
    fontSize: 7,
    color: C.inkMute,
    marginTop: 3,
    fontWeight: 500,
    letterSpacing: 0.3,
  },
});

export interface KarneVerisi {
  ilerleme: Ilerleme;
  stat: Istatistik;
  uniteler: Unite[];
  profil: {
    universite: string;
    bolum: string;
    sinif: string;
    hedef: string;
  };
}

const SINIF_ETIKET: Record<string, string> = {
  hazirlik: 'Hazırlık',
  '1': '1. Sınıf',
  '2': '2. Sınıf',
  '3': '3. Sınıf',
  '4': '4. Sınıf',
  '9': '9. Sınıf',
  '10': '10. Sınıf',
  '11': '11. Sınıf',
  '12': '12. Sınıf',
  mezun: 'Mezun',
  diger: '',
};
const HEDEF_ETIKET: Record<string, string> = {
  'vize-final': 'Vize/Final',
  kpss: 'KPSS',
  genel: 'Genel pratik',
  belirsiz: '',
};

/**
 * Deterministik karne ID — user'in kullanıcı adından + tarihten 8-haneli hash.
 * Aynı kullanıcı aynı gün her zaman aynı ID'yi üretir; tarih değişince ID değişir.
 */
const karneIdUret = (kullaniciAdi: string, tarihYmd: string): string => {
  const giris = `${kullaniciAdi.toLowerCase()}-${tarihYmd}`;
  let hash = 0;
  for (let i = 0; i < giris.length; i++) {
    hash = ((hash << 5) - hash + giris.charCodeAt(i)) | 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
  return `K-${hex}-${tarihYmd.replace(/-/g, '')}`;
};

/**
 * Son 30 günün aktivite haritası: bugünden geriye doğru 30 hücre.
 * En soldaki hücre 29 gün önceki tarih.
 */
const heatmapCellRengi = (sayi: number): string => {
  if (sayi <= 0) return C.line;
  if (sayi === 1) return C.copperSoft;
  if (sayi === 2) return C.copperMid;
  return C.copper; // 3+
};

const son30GunAktivite = (aktiviteTarihleri: Record<string, number>): number[] => {
  const bugun = new Date();
  const sonuc: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const t = new Date(bugun);
    t.setDate(bugun.getDate() - i);
    const ymd = t.toISOString().split('T')[0];
    sonuc.push(aktiviteTarihleri[ymd] ?? 0);
  }
  return sonuc;
};

interface KarneDocProps extends KarneVerisi {
  qrDataUrl: string;
  karneId: string;
}

const KarneDoc = ({ ilerleme, stat, uniteler, profil, qrDataUrl, karneId }: KarneDocProps) => {
  const ad = ilerleme.kullaniciAdi || 'Öğrenci';
  const rekorlar = kisiselRekorlar(ilerleme);
  const yetkinlikler = uniteYetkinlikleri(uniteler, ilerleme);
  const moduller = modulYetkinlikleri(uniteler, ilerleme);
  const kazanilanRozetIds = new Set(Object.keys(ilerleme.kazanilanRozetler));
  const baslananModulSayisi = moduller.filter((m) => m.cozulen > 0).length;
  const aktivite = son30GunAktivite(ilerleme.aktiviteTarihleri);

  const akademik = [
    profil.universite,
    profil.bolum,
    profil.sinif ? SINIF_ETIKET[profil.sinif] : '',
    profil.hedef ? HEDEF_ETIKET[profil.hedef] : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const tarih = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Modülleri işletme türü bazında grupla — CV "Experience" gibi
  const modulGruplari = moduller.reduce<Record<string, typeof moduller>>((acc, m) => {
    (acc[m.uniteAd] = acc[m.uniteAd] ?? []).push(m);
    return acc;
  }, {});

  return (
    <Document
      title={`MuhasebeAkademi Karne — ${ad}`}
      author="MuhasebeAkademi"
      subject="Öğrenci ilerleme karnesi"
    >
      <Page size="A4" style={s.page}>
        {/* ─── BAND 1 — Name Plate ──────────────────────────────────── */}
        <View style={s.namePlate}>
          <View style={s.nameMeta}>
            <Text style={s.brandStrip}>MuhasebeAkademi · Karne</Text>
            <Text style={s.nameDisplay}>{ad}</Text>
            {akademik && <Text style={s.nameContext}>{akademik}</Text>}
          </View>
          <View style={s.dateBlock}>
            <Text style={s.dateLabel}>Tarih</Text>
            <Text style={s.dateValue}>{tarih}</Text>
            <Text style={s.karneIdLabel}>Karne No</Text>
            <Text style={s.karneIdValue}>{karneId}</Text>
          </View>
        </View>

        {/* ─── BAND 2 — § Profil Özeti ─────────────────────────────── */}
        <View style={s.bandGap}>
          <View style={s.sectionHead}>
            <Text style={s.sectionLabel}>§ Profil Özeti</Text>
          </View>
          <View style={s.sectionRule} />
          <View style={s.statRow}>
            <View style={[s.statCol, s.statColFirst]}>
              <Text style={s.statLabel}>Toplam Çözüm</Text>
              <Text style={s.statValue}>{stat.cozulenSayi}</Text>
              <Text style={s.statContext}>/ {stat.toplamSoru} soru</Text>
            </View>
            <View style={s.statCol}>
              <Text style={s.statLabel}>Kazanılan Puan</Text>
              <Text style={s.statValue}>{ilerleme.puan}</Text>
              <Text style={s.statContext}>kazanılan</Text>
            </View>
            <View style={s.statCol}>
              <Text style={s.statLabel}>Rozet</Text>
              <Text style={s.statValue}>{kazanilanRozetIds.size}</Text>
              <Text style={s.statContext}>/ {ROZETLER.length} rozet</Text>
            </View>
            <View style={s.statCol}>
              <Text style={s.statLabel}>En Uzun Streak</Text>
              <Text style={s.statValue}>{rekorlar.enUzunStreak}</Text>
              <Text style={s.statContext}>gün</Text>
            </View>
          </View>
        </View>

        {/* ─── BAND 3 — § Yetkinlikler + § 30 Gün Aktivite ─────────── */}
        <View style={[s.bandGap, s.twoCol]}>
          {/* Yetkinlik (Sol) */}
          <View style={s.colHalf}>
            <View style={s.sectionHead}>
              <Text style={s.sectionLabel}>§ Yetkinlikler · İşletme Türü</Text>
            </View>
            <View style={s.sectionRule} />
            {yetkinlikler.map((y) => (
              <View key={y.uniteId} style={s.yetkinlikRow}>
                <View style={s.yetkinlikLine}>
                  <Text style={s.yetkinlikAd}>{y.uniteAd}</Text>
                  <Text style={s.yetkinlikYuzde}>%{y.yetkinlik}</Text>
                </View>
                <View style={s.yetkinlikBarBg}>
                  <View
                    style={[
                      s.yetkinlikBarFill,
                      { width: `${Math.max(0, Math.min(100, y.yetkinlik))}%` },
                    ]}
                  />
                </View>
                <Text style={s.yetkinlikSub}>
                  {y.cozulenSoru}/{y.toplamSoru} soru
                </Text>
              </View>
            ))}
          </View>

          {/* Heatmap (Sağ) */}
          <View style={s.colHalf}>
            <View style={s.sectionHead}>
              <Text style={s.sectionLabel}>§ Son 30 Gün Aktivite</Text>
            </View>
            <View style={s.sectionRule} />
            <View style={s.heatmapGrid}>
              {aktivite.map((sayi, i) => (
                <View
                  key={i}
                  style={[s.heatCell, { backgroundColor: heatmapCellRengi(sayi) }]}
                />
              ))}
            </View>
            <View style={s.heatLegend}>
              <Text style={s.heatLegendText}>az</Text>
              <View style={[s.heatCell, { width: 10, height: 10, backgroundColor: C.line }]} />
              <View style={[s.heatCell, { width: 10, height: 10, backgroundColor: C.copperSoft }]} />
              <View style={[s.heatCell, { width: 10, height: 10, backgroundColor: C.copperMid }]} />
              <View style={[s.heatCell, { width: 10, height: 10, backgroundColor: C.copper }]} />
              <Text style={s.heatLegendText}>yoğun</Text>
            </View>
          </View>
        </View>

        {/* ─── BAND 4 — § Modül Haritası ───────────────────────────── */}
        <View style={s.bandGap}>
          <View style={s.sectionHead}>
            <Text style={s.sectionLabel}>§ Modül Haritası</Text>
            <Text style={s.sectionLabelExtra}>{baslananModulSayisi}/{moduller.length} başlandı</Text>
          </View>
          <View style={s.sectionRule} />
          {Object.entries(modulGruplari).map(([uniteAd, gMods]) => (
            <View key={uniteAd} style={s.modulGroup}>
              <Text style={s.modulGroupHead}>▸ {uniteAd}</Text>
              {gMods.map((m) => (
                <View key={m.modulId} style={s.modulRow}>
                  <Text
                    style={[
                      m.toplam > 0 ? s.modulAd : s.modulAdDim,
                      { width: '42%', paddingRight: 8 },
                    ]}
                  >
                    M{m.modulSira} · {m.modulAd}
                  </Text>
                  <View style={[s.modulBarBg, { width: '32%' }]}>
                    {m.toplam > 0 && (
                      <View style={[s.modulBarFill, { width: `${m.yuzde}%` }]} />
                    )}
                  </View>
                  <Text style={[s.modulSayi, { width: '26%' }]}>
                    {m.toplam > 0 ? `${m.cozulen}/${m.toplam} · %${m.yuzde}` : 'hazırlanıyor'}
                  </Text>
                </View>
              ))}
            </View>
          ))}
          {moduller.length === 0 && (
            <Text style={s.modulYok}>Modüller henüz oluşturulmadı.</Text>
          )}
        </View>

        {/* ─── BAND 5 — § Başarılar + § Rekorlar ───────────────────── */}
        <View style={[s.bandGap, s.twoCol]}>
          <View style={[s.colHalf, { flex: 1.4 }]}>
            <View style={s.sectionHead}>
              <Text style={s.sectionLabel}>§ Başarılar</Text>
              <Text style={s.sectionLabelExtra}>{kazanilanRozetIds.size}/{ROZETLER.length} rozet</Text>
            </View>
            <View style={s.sectionRule} />
            <View style={s.rozetGrid}>
              {ROZETLER.map((r) => {
                const kazanildi = kazanilanRozetIds.has(r.id);
                return (
                  <View key={r.id} style={kazanildi ? s.rozetChip : s.rozetChipDim}>
                    <Text style={kazanildi ? s.rozetText : s.rozetTextDim}>{r.ad}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={s.colHalf}>
            <View style={s.sectionHead}>
              <Text style={s.sectionLabel}>§ Rekorlar</Text>
            </View>
            <View style={s.sectionRule} />
            <View style={s.rekorGrid}>
              <View style={s.rekorBox}>
                <Text style={s.rekorEt}>Tek Günde</Text>
                <Text style={s.rekorVal}>{rekorlar.enCokGun.sayi}</Text>
                <Text style={s.rekorAlt}>
                  {rekorlar.enCokGun.tarih
                    ? new Date(rekorlar.enCokGun.tarih).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : '—'}
                </Text>
              </View>
              <View style={s.rekorBox}>
                <Text style={s.rekorEt}>Aktif Gün</Text>
                <Text style={s.rekorVal}>{rekorlar.toplamAktifGun}</Text>
                <Text style={s.rekorAlt}>toplam</Text>
              </View>
              <View style={s.rekorBox}>
                <Text style={s.rekorEt}>İlk Soru</Text>
                <Text style={s.rekorVal}>
                  {rekorlar.ilkSoruTarihi
                    ? new Date(rekorlar.ilkSoruTarihi).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : '—'}
                </Text>
                <Text style={s.rekorAlt}>
                  {rekorlar.ilkSoruTarihi
                    ? new Date(rekorlar.ilkSoruTarihi).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                      })
                    : 'henüz yok'}
                </Text>
              </View>
              <View style={s.rekorBox}>
                <Text style={s.rekorEt}>Modül</Text>
                <Text style={s.rekorVal}>{baslananModulSayisi}</Text>
                <Text style={s.rekorAlt}>/ {moduller.length} başlandı</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── BAND 6 — § Doğrulama ────────────────────────────────── */}
        <View style={s.bandGap}>
          <View style={s.sectionHead}>
            <Text style={s.sectionLabel}>§ Doğrulama</Text>
            <Text style={s.sectionLabelExtra}>Karne No · {karneId}</Text>
          </View>
          <View style={s.sectionRule} />
          <View style={s.footerRow}>
            <View style={s.footerText}>
              <Text style={s.footerMain}>
                Bu karne {ad} tarafından {tarih} itibarıyla MuhasebeAkademi üzerinden üretilmiştir.
              </Text>
              <Text style={s.footerSub}>muhasebeakademi.com — bağımsız doğrulama platformu</Text>
            </View>
            <View style={s.qrBlock}>
              {qrDataUrl && <Image src={qrDataUrl} style={s.qrImg} />}
              <Text style={s.qrUrl}>muhasebeakademi.com/k/{karneId.slice(2, 10)}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

/**
 * Karneyi PDF olarak indirir. Önce QR data URL üretir, sonra blob.
 */
export const karneyiIndir = async (veri: KarneVerisi): Promise<void> => {
  const tarihYmd = new Date().toISOString().split('T')[0];
  const ad = veri.ilerleme.kullaniciAdi || 'ogrenci';
  const karneId = karneIdUret(ad, tarihYmd);
  const qrUrl = `https://muhasebeakademi.com/k/${karneId.slice(2, 10)}`;

  // QR — ink üzerine beyaz, kenar boşluğu yok, scale 4 = 132x132 px (PDF'te 56pt'a downsample)
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    margin: 0,
    scale: 4,
    color: { dark: '#0f172a', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });

  const blob = await pdf(
    <KarneDoc {...veri} qrDataUrl={qrDataUrl} karneId={karneId} />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const adSlug = ad.toLowerCase().replace(/[^a-z0-9]/g, '-');
  a.download = `muhasebeakademi-karne-${adSlug}-${tarihYmd}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
