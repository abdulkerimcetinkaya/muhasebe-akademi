import { supabase } from './supabase';
import type {
  AltBaslik,
  Belge,
  Konu,
  Modul,
  ModulZorluk,
  Soru,
  SoruWithUnite,
  Unite,
} from '../types';

// v14: sorular.etiketler text[] kolonu eklendi — kavram + hesap kodu etiketleri.
// v13 not'u: soruya özel muavin sözlüğü.
// v12 not'u: atölye soruları junction tablosundan yükleniyor.
// v11 not'u: mevcut 213 soru arsive cekildi.
// v10 not'u: `icerik` JSONB kolonları liste yüklemesinde çekilmiyor.
const UNITELER_CACHE_KEY = 'mli_uniteler_cache_v14';

interface OnbellekPaketi {
  v: 14;
  ts: number;
  uniteler: Unite[];
}

export interface UnitelerVerisi {
  uniteler: Unite[];
  tumSorular: SoruWithUnite[];
}

// Liste yüklemesinde çekilen kolonlar — icerik/icerik_guncellendi YOK
const SORU_LISTE_KOLONLARI =
  'id, baslik, zorluk, senaryo, ipucu, aciklama, durum, unite_id, konu_id, alt_baslik_id, ekleyen_id, muavinler, etiketler';
const MODUL_LISTE_KOLONLARI =
  'id, unite_id, sira, baslik, aciklama, zorluk_seviyesi, opsiyonel, aktif';
const ALT_BASLIK_LISTE_KOLONLARI = 'id, modul_id, sira, baslik, karma, aktif';
const KONU_LISTE_KOLONLARI = 'id, unite_id, ad, aciklama, sira, aktif';

const duzleTumSorular = (uniteler: Unite[]): SoruWithUnite[] =>
  uniteler.flatMap((u) =>
    u.sorular.map((s) => ({
      ...s,
      uniteId: u.id,
      uniteAd: u.ad,
      uniteIcon: u.thiingsIcon,
    })),
  );

export const uniteleriYukle = async (): Promise<UnitelerVerisi> => {
  const [
    unitesR,
    konularR,
    modullerR,
    altBasliklarR,
    sorularR,
    cozumlerR,
    atolyeSorulariR,
  ] = await Promise.all([
    supabase.from('unites').select('*').order('sira'),
    supabase.from('unite_konulari').select(KONU_LISTE_KOLONLARI).order('sira'),
    supabase.from('unite_modulleri').select(MODUL_LISTE_KOLONLARI).order('sira'),
    supabase
      .from('modul_alt_basliklari')
      .select(ALT_BASLIK_LISTE_KOLONLARI)
      .order('sira'),
    supabase
      .from('sorular')
      .select(SORU_LISTE_KOLONLARI)
      .eq('durum', 'onayli')
      .order('unite_id')
      .order('id'),
    supabase.from('cozumler').select('*').order('soru_id').order('sira'),
    supabase
      .from('atolye_sorulari')
      .select('alt_baslik_id, soru_id, sira')
      .order('alt_baslik_id')
      .order('sira'),
  ]);

  if (unitesR.error) throw new Error(`Ünites yüklenemedi: ${unitesR.error.message}`);
  if (konularR.error) throw new Error(`Konular yüklenemedi: ${konularR.error.message}`);
  if (modullerR.error)
    throw new Error(`Modüller yüklenemedi: ${modullerR.error.message}`);
  if (altBasliklarR.error)
    throw new Error(`Alt başlıklar yüklenemedi: ${altBasliklarR.error.message}`);
  if (sorularR.error) throw new Error(`Sorular yüklenemedi: ${sorularR.error.message}`);
  if (cozumlerR.error) throw new Error(`Çözümler yüklenemedi: ${cozumlerR.error.message}`);
  if (atolyeSorulariR.error)
    throw new Error(`Atölye soruları yüklenemedi: ${atolyeSorulariR.error.message}`);

  const cozumById: Record<string, { kod: string; borc: number; alacak: number }[]> = {};
  (cozumlerR.data ?? []).forEach((c) => {
    if (!cozumById[c.soru_id]) cozumById[c.soru_id] = [];
    cozumById[c.soru_id].push({ kod: c.kod, borc: c.borc, alacak: c.alacak });
  });

  const sorularByUnite: Record<string, Soru[]> = {};
  const sorularByKonu: Record<string, Soru[]> = {};
  const soruById: Record<string, Soru> = {};
  (sorularR.data ?? []).forEach((s) => {
    if (!sorularByUnite[s.unite_id]) sorularByUnite[s.unite_id] = [];
    const altBaslikId = (s as { alt_baslik_id?: string | null }).alt_baslik_id ?? null;
    const muavinlerRaw = (s as { muavinler?: unknown }).muavinler;
    const muavinler = Array.isArray(muavinlerRaw)
      ? (muavinlerRaw as { kod: string; ad: string }[])
      : [];
    const etiketlerRaw = (s as { etiketler?: unknown }).etiketler;
    const etiketler = Array.isArray(etiketlerRaw)
      ? (etiketlerRaw as string[])
      : [];
    const soru: Soru = {
      id: s.id,
      baslik: s.baslik,
      zorluk: s.zorluk,
      senaryo: s.senaryo,
      ipucu: s.ipucu ?? '',
      aciklama: s.aciklama ?? '',
      cozum: cozumById[s.id] ?? [],
      // belgeler liste yüklemesinde çekilmez — SoruEkrani lazy yükler
      belgeler: undefined,
      konuId: s.konu_id ?? null,
      altBaslikId,
      muavinler,
      etiketler,
      ekleyenId: s.ekleyen_id ?? null,
    };
    soruById[s.id] = soru;
    sorularByUnite[s.unite_id].push(soru);
    if (s.konu_id) {
      if (!sorularByKonu[s.konu_id]) sorularByKonu[s.konu_id] = [];
      sorularByKonu[s.konu_id].push(soru);
    }
  });

  // Atölye soruları junction'dan — admin'in atadığı sıraya göre.
  // Sadece "onayli" sorulara referans veren satırlar görünür; arşiv/taslak
  // soruları junction'da olsa bile soruById'da olmadığı için atlanır.
  const sorularByAltBaslik: Record<string, Soru[]> = {};
  (atolyeSorulariR.data ?? []).forEach((r) => {
    const soru = soruById[r.soru_id];
    if (!soru) return;
    if (!sorularByAltBaslik[r.alt_baslik_id]) sorularByAltBaslik[r.alt_baslik_id] = [];
    sorularByAltBaslik[r.alt_baslik_id].push(soru);
  });

  const konularByUnite: Record<string, Konu[]> = {};
  (konularR.data ?? []).forEach((k) => {
    if (!konularByUnite[k.unite_id]) konularByUnite[k.unite_id] = [];
    konularByUnite[k.unite_id].push({
      id: k.id,
      uniteId: k.unite_id,
      ad: k.ad,
      aciklama: k.aciklama ?? null,
      // icerik lazy — KonuSayfasi açılınca konuIcerikYukle çağrılır
      icerik: null,
      sira: k.sira,
      aktif: (k as { aktif?: boolean }).aktif ?? true,
      sorular: sorularByKonu[k.id] ?? [],
    });
  });

  // Alt başlıkları modüllere bağla
  const altBasliklarByModul: Record<string, AltBaslik[]> = {};
  (altBasliklarR.data ?? []).forEach((a) => {
    if (!altBasliklarByModul[a.modul_id]) altBasliklarByModul[a.modul_id] = [];
    altBasliklarByModul[a.modul_id].push({
      id: a.id,
      modulId: a.modul_id,
      sira: a.sira,
      baslik: a.baslik,
      karma: !!a.karma,
      // icerik lazy — AltBaslikSayfasi açılınca altBaslikIcerikYukle çağrılır
      icerik: null,
      icerikGuncellendi: null,
      aktif: (a as { aktif?: boolean }).aktif ?? true,
      sorular: sorularByAltBaslik[a.id] ?? [],
    });
  });

  // Modülleri ünitelere bağla
  const modullerByUnite: Record<string, Modul[]> = {};
  (modullerR.data ?? []).forEach((m) => {
    if (!modullerByUnite[m.unite_id]) modullerByUnite[m.unite_id] = [];
    modullerByUnite[m.unite_id].push({
      id: m.id,
      uniteId: m.unite_id,
      sira: m.sira,
      baslik: m.baslik,
      aciklama: m.aciklama ?? null,
      zorlukSeviyesi: m.zorluk_seviyesi as ModulZorluk,
      opsiyonel: !!m.opsiyonel,
      // icerik lazy — ModulSayfasi açılınca modulIcerikYukle çağrılır
      icerik: null,
      icerikGuncellendi: null,
      aktif: (m as { aktif?: boolean }).aktif ?? true,
      altBasliklar: altBasliklarByModul[m.id] ?? [],
    });
  });

  const uniteler: Unite[] = (unitesR.data ?? []).map((u) => ({
    id: u.id,
    ad: u.ad,
    thiingsIcon: u.thiings_icon ?? u.id,
    aciklama: u.aciklama ?? '',
    icerik: (u as { icerik?: unknown }).icerik ?? null,
    aktif: (u as { aktif?: boolean }).aktif ?? true,
    sorular: sorularByUnite[u.id] ?? [],
    konular: konularByUnite[u.id] ?? [],
    moduller: modullerByUnite[u.id] ?? [],
  }));

  return { uniteler, tumSorular: duzleTumSorular(uniteler) };
};

/**
 * Tek bir sorunun belgelerini ayrı bir query ile çek (lazy load).
 */
export const soruBelgeleriniYukle = async (soruId: string): Promise<Belge[]> => {
  const { data, error } = await supabase
    .from('sorular')
    .select('belgeler')
    .eq('id', soruId)
    .maybeSingle();
  if (error) {
    console.error(`Belgeler yüklenemedi (${soruId}):`, error.message);
    return [];
  }
  const belgeler = (data as { belgeler?: unknown })?.belgeler;
  return Array.isArray(belgeler) ? (belgeler as Belge[]) : [];
};

/**
 * Modül içeriğini (BlockNote JSON) ayrı çek. ModulSayfasi açılınca çağrılır.
 */
export const modulIcerikYukle = async (
  modulId: string,
): Promise<{ icerik: unknown[] | null; icerikGuncellendi: string | null }> => {
  const { data, error } = await supabase
    .from('unite_modulleri')
    .select('icerik, icerik_guncellendi')
    .eq('id', modulId)
    .maybeSingle();
  if (error) {
    console.error(`Modül içeriği yüklenemedi (${modulId}):`, error.message);
    return { icerik: null, icerikGuncellendi: null };
  }
  const icerik = (data as { icerik?: unknown })?.icerik;
  const ts = (data as { icerik_guncellendi?: string | null })?.icerik_guncellendi;
  return {
    icerik: Array.isArray(icerik) ? (icerik as unknown[]) : null,
    icerikGuncellendi: ts ?? null,
  };
};

/**
 * Alt başlık içeriğini ayrı çek. AltBaslikSayfasi açılınca çağrılır.
 */
export const altBaslikIcerikYukle = async (
  altBaslikId: string,
): Promise<{ icerik: unknown[] | null; icerikGuncellendi: string | null }> => {
  const { data, error } = await supabase
    .from('modul_alt_basliklari')
    .select('icerik, icerik_guncellendi')
    .eq('id', altBaslikId)
    .maybeSingle();
  if (error) {
    console.error(`Alt başlık içeriği yüklenemedi (${altBaslikId}):`, error.message);
    return { icerik: null, icerikGuncellendi: null };
  }
  const icerik = (data as { icerik?: unknown })?.icerik;
  const ts = (data as { icerik_guncellendi?: string | null })?.icerik_guncellendi;
  return {
    icerik: Array.isArray(icerik) ? (icerik as unknown[]) : null,
    icerikGuncellendi: ts ?? null,
  };
};

/**
 * Konu içeriğini ayrı çek. KonuSayfasi açılınca çağrılır.
 */
export const konuIcerikYukle = async (konuId: string): Promise<unknown> => {
  const { data, error } = await supabase
    .from('unite_konulari')
    .select('icerik')
    .eq('id', konuId)
    .maybeSingle();
  if (error) {
    console.error(`Konu içeriği yüklenemedi (${konuId}):`, error.message);
    return null;
  }
  return (data as { icerik?: unknown })?.icerik ?? null;
};

export const uniteleriCachedenOku = (): UnitelerVerisi | null => {
  try {
    const raw = localStorage.getItem(UNITELER_CACHE_KEY);
    if (!raw) return null;
    const paket = JSON.parse(raw) as OnbellekPaketi;
    if (paket.v !== 14 || !Array.isArray(paket.uniteler)) return null;
    return { uniteler: paket.uniteler, tumSorular: duzleTumSorular(paket.uniteler) };
  } catch {
    return null;
  }
};

export const uniteleriCacheeYaz = (uniteler: Unite[]): void => {
  try {
    const paket: OnbellekPaketi = { v: 14, ts: Date.now(), uniteler };
    localStorage.setItem(UNITELER_CACHE_KEY, JSON.stringify(paket));
  } catch {
    // ignore (quota)
  }
};
