export type HesapTuru = 'AKTİF' | 'PASİF' | 'GELİR' | 'GİDER' | 'MALİYET' | 'KAPANIŞ';
export type HesapSinif = '1' | '2' | '3' | '4' | '5' | '6' | '7';

export interface Hesap {
  kod: string;
  ad: string;
  sinif: HesapSinif;
  tur: HesapTuru;
}

export type Zorluk = 'kolay' | 'orta' | 'zor';

export interface CozumSatir {
  kod: string;
  borc: number;
  alacak: number;
}

export type BelgeTuru = 'fatura' | 'perakende-fis' | 'cek' | 'senet' | 'dekont';

export interface FaturaKalem {
  aciklama: string;
  miktar: number;
  birim: string;
  birimFiyat: number;
  iskontoOrani?: number;
}

export interface TarafBilgi {
  unvan: string;
  vkn?: string;
  tcKimlik?: string;
  vergiDairesi?: string;
  adres?: string;
}

export interface FaturaBelge {
  tur: 'fatura';
  baslik?: string;
  faturaTipi?: 'satis' | 'alis' | 'iade';
  faturaNo: string;
  tarih: string;
  ettn?: string;
  satici: TarafBilgi;
  alici: TarafBilgi;
  kalemler: FaturaKalem[];
  kdvOrani: number;
  ekKdvDahilTutar?: number;
  tevkifatPay?: number;
  tevkifatPayda?: number;
  tevkifatAciklama?: string;
  not?: string;
  odemeBilgisi?: string;
}

export interface PerakendeFisKalem {
  aciklama: string;
  miktar: number;
  birimFiyat: number;
  kdvOrani: number;
}

export interface PerakendeFisBelge {
  tur: 'perakende-fis';
  baslik?: string;
  fisNo: string;
  tarih: string;
  saat?: string;
  zNo?: string;
  ettn?: string;
  isletme: TarafBilgi;
  kalemler: PerakendeFisKalem[];
  odemeYontemi?: 'NAKIT' | 'KART' | 'KARMA';
  not?: string;
}

export interface CekBelge {
  tur: 'cek';
  baslik?: string;
  cekNo: string;
  bankaAdi: string;
  subeAdi?: string;
  subeKodu?: string;
  hesapNo?: string;
  iban?: string;
  duzenlemeTarihi: string;
  duzenlemeYeri?: string;
  vadeTarihi: string;
  tutar: number;
  lehtar: string;
  kesideci: TarafBilgi;
  not?: string;
}

export interface SenetBelge {
  tur: 'senet';
  baslik?: string;
  senetTipi?: 'bono' | 'police';
  senetNo: string;
  duzenlemeTarihi: string;
  duzenlemeYeri?: string;
  vadeTarihi: string;
  vadeYeri?: string;
  tutar: number;
  lehtar: TarafBilgi;
  borclu: TarafBilgi;
  not?: string;
}

export type DekontIslemTuru =
  | 'HAVALE'
  | 'EFT'
  | 'KREDI_KULLANIMI'
  | 'KREDI_TAKSIT'
  | 'MASRAF'
  | 'FAIZ_GELIRI'
  | 'POS_TAHSILATI';

export interface DekontBelge {
  tur: 'dekont';
  baslik?: string;
  bankaAdi: string;
  subeAdi?: string;
  subeKodu?: string;
  dekontNo: string;
  islemTarihi: string;
  islemSaati?: string;
  valor?: string;
  islemTuru: DekontIslemTuru;
  aciklama: string;
  hesapSahibi: TarafBilgi;
  hesapNo?: string;
  iban?: string;
  karsiTaraf?: TarafBilgi;
  karsiIban?: string;
  tutar: number;
  bsmv?: number;
  masraf?: number;
  netTutar?: number;
  yon: 'BORC' | 'ALACAK';
  bakiye?: number;
  not?: string;
}

export type Belge = FaturaBelge | PerakendeFisBelge | CekBelge | SenetBelge | DekontBelge;

/** Soruya özel muavin (örn: 100.001 Merkez Kasa). Global tabloya yazılmaz. */
export interface SoruMuavin {
  kod: string;
  ad: string;
}

export interface Soru {
  id: string;
  baslik: string;
  zorluk: Zorluk;
  senaryo: string;
  ipucu: string;
  aciklama: string;
  cozum: CozumSatir[];
  belgeler?: Belge[];
  konuId?: string | null;
  /** Yeni atölye yapısı: hangi alt başlığa bağlı. Null ise eski seed. */
  altBaslikId?: string | null;
  /** Bu soruya özel muavinler — HesapKoduInput dropdown'unda global ile birleşir. */
  muavinler?: SoruMuavin[];
  /** Etiketler — kavram + hesap kodu kategorizasyonu (Problemler filtre/badge). */
  etiketler?: string[];
  /** Katkıcı ekledi ise yazar user_id'si. Adı/unvanı ek sorguyla çekilir. */
  ekleyenId?: string | null;
}

export interface SoruWithUnite extends Soru {
  uniteId: string;
  uniteAd: string;
  uniteIcon: string;
}

/**
 * Ünite alt-konusu — LeetCode-tarzı mikro yapı.
 * Her konu kendi BlockNote içeriğine ve sıralı sorularına sahip.
 */
export interface Konu {
  id: string;
  uniteId: string;
  ad: string;
  aciklama: string | null;
  /** BlockNote JSON dokümanı (admin panelinde yazılıyor). */
  icerik?: unknown | null;
  sira: number;
  /** Aktif değilse kullanıcı tarafında "Yakında" rozetiyle görünür, tıklanamaz. */
  aktif: boolean;
  sorular: Soru[];
}

export interface Unite {
  id: string;
  ad: string;
  thiingsIcon: string;
  aciklama: string;
  /** BlockNote JSON dökümanı (admin panelinde yazılıyor). Boşsa içerik henüz hazırlanmadı. */
  icerik?: unknown | null;
  /** Aktif değilse kullanıcı tarafında "Yakında" rozetiyle görünür, tıklanamaz. */
  aktif: boolean;
  sorular: Soru[];
  /** Alt-konular — sırayla. Boşsa eski yapı (sorular doğrudan ünitede). */
  konular?: Konu[];
  /** Yeni atölye yapısı — modüller. Boşsa bu ünite henüz modüllenmedi. */
  moduller?: Modul[];
}

/**
 * Modül zorluk seviyesi — soru zorluğundan ayrı bir kavram.
 * Modül seviyeyi temsil eder; modül içindeki sorular `Zorluk` (kolay/orta/zor) taşır.
 */
export type ModulZorluk = 'baslangic' | 'orta' | 'ileri' | 'sinav';

/**
 * Atölye modülü — bir ünitenin altında sıralı çalışma birimi.
 * Modül 1 → 9 ilerleyişi, her modül kendi alt başlıkları üzerinden tamamlanır.
 */
export interface Modul {
  id: string;
  uniteId: string;
  sira: number;
  baslik: string;
  aciklama: string | null;
  zorlukSeviyesi: ModulZorluk;
  /** Opsiyonel modüller bir sonrakini kilitlemez (örn. M8). */
  opsiyonel: boolean;
  /** BlockNote Block[] — modülün "Genel Bakış" sayfasındaki konu anlatımı. */
  icerik?: unknown[] | null;
  icerikGuncellendi?: string | null;
  /** Aktif değilse kullanıcı tarafında "Yakında" rozetiyle görünür, tıklanamaz. */
  aktif: boolean;
  altBasliklar: AltBaslik[];
}

/**
 * Alt başlık — bir modülün içindeki atölye birimi.
 * Senaryolar (sorular) buraya bağlanır. Karma alt başlıklar UI'da yıldız ile vurgulanır.
 */
export interface AltBaslik {
  id: string;
  modulId: string;
  sira: number;
  baslik: string;
  karma: boolean;
  /** BlockNote Block[] — alt başlığın konu anlatımı (sorulardan önce gösterilir). */
  icerik?: unknown[] | null;
  icerikGuncellendi?: string | null;
  /** Aktif değilse kullanıcı tarafında "Yakında" rozetiyle görünür, tıklanamaz. */
  aktif: boolean;
  sorular: Soru[];
}

export interface UserRow {
  kod: string;
  borc: string | number;
  alacak: string | number;
  aciklama?: string;
}

export type FisTuru = 'M' | 'T' | 'Ö' | 'A' | 'K' | 'V';

export interface FisBilgi {
  yevmiyeNo: string;
  tarih: string;
  fisTuru: FisTuru;
  belgeNo: string;
  aciklama: string;
}

export interface CozulenKayit {
  tarih: string;
  zorluk: Zorluk;
  /**
   * Bu çözümden gerçekten kazanılan puan (0..ZORLUK_PUAN[zorluk]).
   * Eski (migration öncesi) kayıtlarda eksik olabilir → ZORLUK_PUAN
   * üzerinden geriye dönük türetilir.
   */
  puan?: number;
  /**
   * Çözüm sırasında kullanılan yardımlar (analitik + UI için).
   */
  yardim?: {
    kullanilanAi?: boolean;
    cozumGosterildi?: boolean;
  };
}

export interface Ilerleme {
  kullaniciAdi: string;
  // Ad/Soyad — onboarding'de toplanır, AnaSayfa "Merhaba, {ad}" için
  ad: string | null;
  soyad: string | null;
  cozulenler: Record<string, CozulenKayit>;
  yanlislar: Record<string, number>;
  puan: number;
  streak: number;
  sonCozumTarihi: string | null;
  aktiviteTarihleri: Record<string, number>;
  kazanilanRozetler: Record<string, string>;
  tema: 'light' | 'dark';
  onboardingTamam?: boolean;
}

export interface Istatistik {
  cozulenSayi: number;
  toplamSoru: number;
  zorCozum: number;
  ortaCozum: number;
  kolayCozum: number;
  uniteTamamlanmis: Record<string, boolean>;
  puan: number;
  streak: number;
}

export interface Rozet {
  id: string;
  ad: string;
  aciklama: string;
  icon: string;
  kontrol: (s: Istatistik) => boolean;
  /** Sayısal hedefli rozetlerde "ne kadar yakınım" göstergesi.
   *  Binary rozetlerde (ünite tamamla vb.) tanımlanmaz. */
  ilerleme?: (s: Istatistik) => { mevcut: number; hedef: number };
}

export interface LiderlikRow {
  id: string;
  kullaniciAdi: string;
  universite: string | null;
  sinif: string | null;
  avatarUrl: string | null;
  cozulenSoru: number;
  toplamPuan: number;
  rozetSayisi: number;
}

export type LiderlikDonem = 'tum' | 'ay' | 'hafta';
