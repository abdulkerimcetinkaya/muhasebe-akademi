import { supabase } from './supabase';
import type { MuavinHesapRow, MuavinTip } from './database.types';

export type MuavinHesap = MuavinHesapRow;

/**
 * TDHP sınıf → grup hiyerarşisi.
 * Sınıf başlıkları UI'da kalın ayırıcı olarak gösterilir (seçilemez).
 * Sadece gruplar (kod alanı) seçilebilir.
 */
export const MUAVIN_SINIFLARI: {
  sinif: string;
  etiket: string;
  gruplar: { kod: MuavinTip; etiket: string }[];
}[] = [
  {
    sinif: '1',
    etiket: '1. Dönen Varlıklar',
    gruplar: [
      { kod: '10', etiket: 'Hazır Değerler' },
      { kod: '11', etiket: 'Menkul Kıymetler' },
      { kod: '12', etiket: 'Ticari Alacaklar' },
      { kod: '13', etiket: 'Diğer Alacaklar' },
      { kod: '15', etiket: 'Stoklar' },
      { kod: '17', etiket: 'Yıllara Yaygın İnşaat ve Onarım Maliyetleri' },
      { kod: '18', etiket: 'Gelecek Aylara Ait Giderler ve Gelir Tahakkukları' },
      { kod: '19', etiket: 'Diğer Dönen Varlıklar' },
    ],
  },
  {
    sinif: '2',
    etiket: '2. Duran Varlıklar',
    gruplar: [
      { kod: '22', etiket: 'Ticari Alacaklar' },
      { kod: '23', etiket: 'Diğer Alacaklar' },
      { kod: '24', etiket: 'Mali Duran Varlıklar' },
      { kod: '25', etiket: 'Maddi Duran Varlıklar' },
      { kod: '26', etiket: 'Maddi Olmayan Duran Varlıklar' },
      { kod: '27', etiket: 'Özel Tükenmeye Tabi Varlıklar' },
      { kod: '28', etiket: 'Gelecek Yıllara Ait Giderler ve Gelir Tahakkukları' },
      { kod: '29', etiket: 'Diğer Duran Varlıklar' },
    ],
  },
  {
    sinif: '3',
    etiket: '3. Kısa Vadeli Yabancı Kaynaklar',
    gruplar: [
      { kod: '30', etiket: 'Mali Borçlar' },
      { kod: '32', etiket: 'Ticari Borçlar' },
      { kod: '33', etiket: 'Diğer Borçlar' },
      { kod: '34', etiket: 'Alınan Avanslar' },
      { kod: '35', etiket: 'Yıllara Yaygın İnşaat ve Onarım Hakedişleri' },
      { kod: '36', etiket: 'Ödenecek Vergi ve Diğer Yükümlülükler' },
      { kod: '37', etiket: 'Borç ve Gider Karşılıkları' },
      { kod: '38', etiket: 'Gelecek Aylara Ait Gelirler ve Gider Tahakkukları' },
      { kod: '39', etiket: 'Diğer Kısa Vadeli Yabancı Kaynaklar' },
    ],
  },
  {
    sinif: '4',
    etiket: '4. Uzun Vadeli Yabancı Kaynaklar',
    gruplar: [
      { kod: '40', etiket: 'Mali Borçlar' },
      { kod: '42', etiket: 'Ticari Borçlar' },
      { kod: '43', etiket: 'Diğer Borçlar' },
      { kod: '44', etiket: 'Alınan Avanslar' },
      { kod: '47', etiket: 'Borç ve Gider Karşılıkları' },
      { kod: '48', etiket: 'Gelecek Yıllara Ait Gelirler ve Gider Tahakkukları' },
      { kod: '49', etiket: 'Diğer Uzun Vadeli Yabancı Kaynaklar' },
    ],
  },
  {
    sinif: '5',
    etiket: '5. Özkaynaklar',
    gruplar: [
      { kod: '50', etiket: 'Ödenmiş Sermaye' },
      { kod: '52', etiket: 'Sermaye Yedekleri' },
      { kod: '54', etiket: 'Kâr Yedekleri' },
      { kod: '57', etiket: 'Geçmiş Yıllar Kârları' },
      { kod: '58', etiket: 'Geçmiş Yıllar Zararları (-)' },
      { kod: '59', etiket: 'Dönem Net Kârı (Zararı)' },
    ],
  },
  {
    sinif: '6',
    etiket: '6. Gelir Tablosu Hesapları',
    gruplar: [
      { kod: '60', etiket: 'Brüt Satışlar' },
      { kod: '61', etiket: 'Satış İndirimleri (-)' },
      { kod: '62', etiket: 'Satışların Maliyeti (-)' },
      { kod: '63', etiket: 'Faaliyet Giderleri (-)' },
      { kod: '64', etiket: 'Diğer Faaliyetlerden Olağan Gelir ve Kârlar' },
      { kod: '65', etiket: 'Diğer Faaliyetlerden Olağan Gider ve Zararlar (-)' },
      { kod: '66', etiket: 'Finansman Giderleri (-)' },
      { kod: '67', etiket: 'Olağandışı Gelir ve Kârlar' },
      { kod: '68', etiket: 'Olağandışı Gider ve Zararlar (-)' },
      { kod: '69', etiket: 'Dönem Net Kârı veya Zararı' },
    ],
  },
  {
    sinif: '7',
    etiket: '7. Maliyet Hesapları',
    gruplar: [
      { kod: '70', etiket: 'Maliyet Muhasebesi Bağlantı Hesapları' },
      { kod: '71', etiket: 'Direkt İlkmadde ve Malzeme Giderleri' },
      { kod: '72', etiket: 'Direkt İşçilik Giderleri' },
      { kod: '73', etiket: 'Genel Üretim Giderleri' },
      { kod: '74', etiket: 'Hizmet Üretim Maliyeti' },
      { kod: '75', etiket: 'Araştırma ve Geliştirme Giderleri' },
      { kod: '76', etiket: 'Pazarlama Satış ve Dağıtım Giderleri' },
      { kod: '77', etiket: 'Genel Yönetim Giderleri' },
      { kod: '78', etiket: 'Finansman Giderleri' },
    ],
  },
];

export const TIP_ETIKETLERI: Record<MuavinTip, string> = Object.fromEntries(
  MUAVIN_SINIFLARI.flatMap((s) => s.gruplar.map((g) => [g.kod, g.etiket])),
) as Record<MuavinTip, string>;

export const TIP_LISTESI: MuavinTip[] = MUAVIN_SINIFLARI.flatMap((s) =>
  s.gruplar.map((g) => g.kod),
);

const TABLO = 'muavin_hesaplar';

/** Admin için — aktif/pasif tüm muavinler, kod sırasına göre. */
export const tumMuavinleriYukle = async (): Promise<MuavinHesap[]> => {
  const { data, error } = await supabase
    .from(TABLO)
    .select('*')
    .order('kod', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MuavinHesap[];
};

/** Sadece aktif muavinler — soru editöründe ve dropdown'larda kullanılır. */
export const aktifMuavinleriYukle = async (): Promise<MuavinHesap[]> => {
  const { data, error } = await supabase
    .from(TABLO)
    .select('*')
    .eq('aktif', true)
    .order('kod', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MuavinHesap[];
};

/** Belirli bir ana hesabın aktif muavinleri (örn: 120 → 120.001, 120.002...). */
export const anaHesabinMuavinleri = async (anaKod: string): Promise<MuavinHesap[]> => {
  const { data, error } = await supabase
    .from(TABLO)
    .select('*')
    .eq('ana_kod', anaKod)
    .eq('aktif', true)
    .order('kod', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MuavinHesap[];
};

export type YeniMuavin = {
  kod: string;
  ana_kod: string;
  ad: string;
  tip: MuavinTip;
  aciklama?: string | null;
  sira?: number;
  aktif?: boolean;
};

export const muavinYarat = async (input: YeniMuavin): Promise<MuavinHesap> => {
  const { data, error } = await supabase
    .from(TABLO)
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as MuavinHesap;
};

export const muavinGuncelle = async (
  kod: string,
  patch: Partial<YeniMuavin>,
): Promise<void> => {
  const { error } = await supabase.from(TABLO).update(patch).eq('kod', kod);
  if (error) throw error;
};

export const muavinSil = async (kod: string): Promise<void> => {
  const { error } = await supabase.from(TABLO).delete().eq('kod', kod);
  if (error) throw error;
};

/**
 * Bir ana hesap için bir sonraki müsait muavin kodunu üretir.
 * 120 → ilk muavin yoksa 120.001, varsa 120.{son+1} (zero-padded 3 haneli).
 */
export const sonrakiMuavinKodu = async (anaKod: string): Promise<string> => {
  const { data, error } = await supabase
    .from(TABLO)
    .select('kod')
    .eq('ana_kod', anaKod)
    .order('kod', { ascending: false })
    .limit(1);
  if (error) throw error;
  if (!data || data.length === 0) {
    return `${anaKod}.001`;
  }
  const sonKod = data[0].kod as string;
  const parcalar = sonKod.split('.');
  const sonSayi = parseInt(parcalar[parcalar.length - 1], 10);
  parcalar[parcalar.length - 1] = String(sonSayi + 1).padStart(3, '0');
  return parcalar.join('.');
};
