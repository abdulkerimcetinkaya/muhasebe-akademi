import { supabase } from './supabase';
import { ZORLUK_PUAN, puanHesapla } from '../data/sabitler';
import { bugununTarihi } from './format';
import { varsayilanIlerleme } from './ilerleme';
import type { CozulenKayit, Ilerleme, SoruWithUnite, Zorluk } from '../types';

export interface CozumYardim {
  kullanilanAi?: boolean;
  cozumGosterildi?: boolean;
}

export const dunTarihi = (gun: string): string => {
  const d = new Date(gun);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

const soruZorlukMap = (tumSorular: SoruWithUnite[]): Record<string, Zorluk> =>
  tumSorular.reduce(
    (acc, s) => {
      acc[s.id] = s.zorluk;
      return acc;
    },
    {} as Record<string, Zorluk>,
  );

// Ardışık aktivite tarihlerinden streak hesapla
export const streakHesapla = (aktiviteTarihleri: Record<string, number>): { streak: number; sonTarih: string | null } => {
  const tarihler = Object.keys(aktiviteTarihleri).sort();
  if (tarihler.length === 0) return { streak: 0, sonTarih: null };
  const sonTarih = tarihler[tarihler.length - 1];
  const bugun = bugununTarihi();
  const dun = dunTarihi(bugun);
  if (sonTarih !== bugun && sonTarih !== dun) return { streak: 0, sonTarih };
  let streak = 1;
  for (let i = tarihler.length - 2; i >= 0; i--) {
    if (tarihler[i] === dunTarihi(tarihler[i + 1])) streak++;
    else break;
  }
  return { streak, sonTarih };
};

export const ilerlemeYukleSupabase = async (
  userId: string,
  tumSorular: SoruWithUnite[],
): Promise<Ilerleme> => {
  const [profilSonuc, ilerlemeSonuc, rozetlerSonuc, aktiviteSonuc] = await Promise.all([
    supabase
      .from('kullanicilar')
      .select('kullanici_adi, ad, soyad, tema, onboarding_tamam_at')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('ilerleme')
      .select('soru_id, dogru_mu, created_at, kullanilan_ai, cozum_gosterildi, kazanilan_puan')
      .eq('user_id', userId),
    supabase.from('kazanilan_rozetler').select('rozet_id, kazanilan_tarih').eq('user_id', userId),
    supabase.from('aktivite').select('tarih, cozulen_sayi').eq('user_id', userId),
  ]);

  const baslangic = varsayilanIlerleme();
  const profil = profilSonuc.data;
  if (profil) {
    baslangic.kullaniciAdi = profil.kullanici_adi;
    baslangic.tema = profil.tema;
    baslangic.ad = profil.ad ?? null;
    baslangic.soyad = profil.soyad ?? null;
  }

  const soruZorluk = soruZorlukMap(tumSorular);

  // Best-score mantığı: aynı soru için birden fazla doğru kayıt varsa
  // en yüksek puanlı olanı seç. Eski kayıtlarda kazanilan_puan null,
  // o zaman tam puan (yardımsız varsay).
  const cozulenler: Record<string, CozulenKayit> = {};
  const yanlislar: Record<string, number> = {};
  for (const row of ilerlemeSonuc.data ?? []) {
    if (row.dogru_mu) {
      const zorluk = soruZorluk[row.soru_id] ?? 'kolay';
      const yardim: CozulenKayit['yardim'] = {
        kullanilanAi: row.kullanilan_ai ?? false,
        cozumGosterildi: row.cozum_gosterildi ?? false,
      };
      const puan =
        row.kazanilan_puan ??
        puanHesapla(zorluk, yardim);
      const mevcut = cozulenler[row.soru_id];
      if (!mevcut || puan > (mevcut.puan ?? 0)) {
        cozulenler[row.soru_id] = {
          tarih: row.created_at.split('T')[0],
          zorluk,
          puan,
          yardim,
        };
      }
    } else {
      yanlislar[row.soru_id] = (yanlislar[row.soru_id] ?? 0) + 1;
    }
  }
  const puan = Object.values(cozulenler).reduce(
    (s, c) => s + (c.puan ?? ZORLUK_PUAN[c.zorluk]),
    0,
  );

  const aktiviteTarihleri: Record<string, number> = {};
  for (const row of aktiviteSonuc.data ?? []) {
    aktiviteTarihleri[row.tarih] = row.cozulen_sayi;
  }

  const kazanilanRozetler: Record<string, string> = {};
  for (const row of rozetlerSonuc.data ?? []) {
    kazanilanRozetler[row.rozet_id] = row.kazanilan_tarih.split('T')[0];
  }

  const { streak, sonTarih } = streakHesapla(aktiviteTarihleri);

  // Onboarding durumu: önce kalıcı flag, yoksa türet (legacy uyumu)
  const onboardingTamam =
    !!profil?.onboarding_tamam_at ||
    Object.keys(cozulenler).length > 0 ||
    (!!baslangic.kullaniciAdi && baslangic.kullaniciAdi !== 'Öğrenci');

  return {
    ...baslangic,
    cozulenler,
    yanlislar,
    puan,
    streak,
    sonCozumTarihi: sonTarih,
    aktiviteTarihleri,
    kazanilanRozetler,
    onboardingTamam,
  };
};

export const soruCozumKaydetSupabase = async (
  userId: string,
  soruId: string,
  bugun: string,
  zorluk: Zorluk,
  yardim: CozumYardim = {},
): Promise<void> => {
  const kazanilanPuan = puanHesapla(zorluk, yardim);
  // M9 — doğru çözüm: ilerleme insert + XP dağıtımı (soru→olay→olay_yetkinlikleri)
  // tek atomik RPC. Kullanıcı auth.uid()'den; kazanilan_puan motivasyon katmanı için.
  const { error } = await supabase.rpc('ilerleme_kaydet', {
    _soru_id: soruId,
    _dogru_mu: true,
    _kullanilan_ai: yardim.kullanilanAi ?? false,
    _cozum_gosterildi: yardim.cozumGosterildi ?? false,
    _kazanilan_puan: kazanilanPuan,
  });
  if (error) throw error;
  // aktivite upsert (RPC aktivite yazmaz): aynı (user_id, tarih) varsa cozulen_sayi +1
  const { data: mevcut } = await supabase
    .from('aktivite')
    .select('cozulen_sayi')
    .eq('user_id', userId)
    .eq('tarih', bugun)
    .maybeSingle();
  await supabase.from('aktivite').upsert({
    user_id: userId,
    tarih: bugun,
    cozulen_sayi: (mevcut?.cozulen_sayi ?? 0) + 1,
  });
};

/**
 * Günlük giriş kaydı — streak için. Aktivite'ye bugün kaydı yoksa
 * cozulen_sayi=0 ile ekler. Streak artık soru çözümüne değil
 * günlük girişe bağlı: kullanıcı her gün siteye girerse seri devam eder.
 */
export const gunlukGirisKaydetSupabase = async (
  userId: string,
  bugun: string,
): Promise<void> => {
  const { data: mevcut } = await supabase
    .from('aktivite')
    .select('tarih')
    .eq('user_id', userId)
    .eq('tarih', bugun)
    .maybeSingle();
  if (mevcut) return;
  await supabase.from('aktivite').insert({
    user_id: userId,
    tarih: bugun,
    cozulen_sayi: 0,
  });
};

export const yanlisKaydetSupabase = async (userId: string, soruId: string): Promise<void> => {
  void userId; // RPC kullanıcıyı auth.uid()'den alır; imza App uyumu için korunur.
  // M9 — yanlış çözüm: ilerleme (dogru_mu=false) + yetkinlik yanlis_sayisi++ (zayıf alan).
  const { error } = await supabase.rpc('ilerleme_kaydet', {
    _soru_id: soruId,
    _dogru_mu: false,
  });
  if (error) throw error;
};

export const rozetKaydetSupabase = async (userId: string, rozetId: string): Promise<void> => {
  await supabase
    .from('kazanilan_rozetler')
    .upsert({ user_id: userId, rozet_id: rozetId }, { onConflict: 'user_id,rozet_id' });
};

export const profilKaydetSupabase = async (
  userId: string,
  guncel: Partial<{
    kullanici_adi: string;
    ad: string;
    soyad: string;
    tema: 'light' | 'dark';
    onboarding_tamam_at: string;
  }>,
): Promise<void> => {
  const { error } = await supabase.from('kullanicilar').update(guncel).eq('id', userId);
  if (error) throw error;
};

// İlk login: localStorage verisini Supabase'e basıp tek seferlik migration yap.
// Çakışma çözümü yok — Supabase'de zaten veri varsa atla (yeniden migrate olmaması için).
export const ilerlemeMigrateSupabase = async (
  userId: string,
  yerel: Ilerleme,
): Promise<{ migrateEdildi: boolean; satirSayisi: number }> => {
  const { count } = await supabase
    .from('ilerleme')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if ((count ?? 0) > 0) return { migrateEdildi: false, satirSayisi: 0 };
  if (Object.keys(yerel.cozulenler).length === 0) return { migrateEdildi: false, satirSayisi: 0 };

  const ilerlemeSatirlari = Object.entries(yerel.cozulenler).map(([soruId, k]) => ({
    user_id: userId,
    soru_id: soruId,
    dogru_mu: true,
    created_at: `${k.tarih}T12:00:00Z`,
  }));

  const yanlisSatirlari: { user_id: string; soru_id: string; dogru_mu: boolean }[] = [];
  for (const [soruId, sayi] of Object.entries(yerel.yanlislar)) {
    for (let i = 0; i < sayi; i++) {
      yanlisSatirlari.push({ user_id: userId, soru_id: soruId, dogru_mu: false });
    }
  }

  const aktiviteSatirlari = Object.entries(yerel.aktiviteTarihleri).map(([tarih, sayi]) => ({
    user_id: userId,
    tarih,
    cozulen_sayi: sayi,
  }));

  const rozetSatirlari = Object.keys(yerel.kazanilanRozetler).map((rozetId) => ({
    user_id: userId,
    rozet_id: rozetId,
  }));

  const tumSatirlar = [...ilerlemeSatirlari, ...yanlisSatirlari];

  await Promise.all([
    tumSatirlar.length > 0 ? supabase.from('ilerleme').insert(tumSatirlar) : Promise.resolve(),
    aktiviteSatirlari.length > 0
      ? supabase.from('aktivite').upsert(aktiviteSatirlari, { onConflict: 'user_id,tarih' })
      : Promise.resolve(),
    rozetSatirlari.length > 0
      ? supabase
          .from('kazanilan_rozetler')
          .upsert(rozetSatirlari, { onConflict: 'user_id,rozet_id' })
      : Promise.resolve(),
    profilKaydetSupabase(userId, { kullanici_adi: yerel.kullaniciAdi, tema: yerel.tema }),
  ]);

  return { migrateEdildi: true, satirSayisi: tumSatirlar.length };
};
