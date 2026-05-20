// MuhasebeLab — Supabase tablo tipleri (manuel — supabase gen types ile değiştirilecek)
// Şema kaynağı: supabase/migrations/20260422000001_init.sql
// NOT: Supabase generic'i interface yerine type ister (Record<string, unknown> uyumu).

export type Sinif = '1' | '2' | '3' | '4' | '5' | '6' | '7';
export type HesapTur = 'AKTİF' | 'PASİF' | 'GELİR' | 'GİDER' | 'MALİYET' | 'KAPANIŞ';
export type SoruDurum = 'taslak' | 'inceleme' | 'onayli' | 'arsiv';
export type Zorluk = 'kolay' | 'orta' | 'zor';
export type OdemeDurum = 'beklemede' | 'basarili' | 'iptal' | 'iade' | 'hata';
export type OdemeDonem = 'aylik' | 'yillik';
// TDHP grup kodu — muavin'in bağlı olduğu hesap grubu (2 haneli).
// Sınıf bilgisi (1-7) kodun ilk hanesinden türetilir; UI'da sadece etiket ayırıcı.
export type MuavinTip =
  // 1 — Dönen Varlıklar
  | '10' | '11' | '12' | '13' | '15' | '17' | '18' | '19'
  // 2 — Duran Varlıklar
  | '22' | '23' | '24' | '25' | '26' | '27' | '28' | '29'
  // 3 — Kısa Vadeli Yabancı Kaynaklar
  | '30' | '32' | '33' | '34' | '35' | '36' | '37' | '38' | '39'
  // 4 — Uzun Vadeli Yabancı Kaynaklar
  | '40' | '42' | '43' | '44' | '47' | '48' | '49'
  // 5 — Özkaynaklar
  | '50' | '52' | '54' | '57' | '58' | '59'
  // 6 — Gelir Tablosu Hesapları
  | '60' | '61' | '62' | '63' | '64' | '65' | '66' | '67' | '68' | '69'
  // 7 — Maliyet Hesapları
  | '70' | '71' | '72' | '73' | '74' | '75' | '76' | '77' | '78';

export type HesapPlaniRow = {
  kod: string;
  ad: string;
  sinif: Sinif;
  tur: HesapTur;
  sira: number;
};

export type MuavinHesapRow = {
  kod: string;
  ana_kod: string;
  ad: string;
  tip: MuavinTip;
  aciklama: string | null;
  sira: number;
  aktif: boolean;
  created_at: string;
  updated_at: string;
};

// 20260519000001 — atölye sorularını yönetmek için many-to-many junction.
// sorular.alt_baslik_id artık "konu havuzu etiketi"; atölye müfredatı
// burada belirlenir.
export type AtolyeSoruRow = {
  alt_baslik_id: string;
  soru_id: string;
  sira: number;
  eklenme: string;
};

export type UnitesRow = {
  id: string;
  ad: string;
  aciklama: string | null;
  thiings_icon: string | null;
  sira: number;
  icerik: unknown | null;
  icerik_guncellendi: string | null;
  // 20260516000007 — aktif/pasif kontrolü (admin yönetir)
  aktif: boolean;
  created_at: string;
};

// Soruya özel muavin — her soru kendi muavin sözlüğünü taşır.
// Global muavin_hesaplar tablosuna yazılmaz; bu listeden gelir.
export type SoruMuavin = {
  kod: string;
  ad: string;
};

export type SorularRow = {
  id: string;
  unite_id: string;
  konu_id: string | null;
  alt_baslik_id: string | null;
  baslik: string;
  zorluk: Zorluk;
  senaryo: string;
  ipucu: string | null;
  aciklama: string | null;
  durum: SoruDurum;
  kaynak: string | null;
  yayinlanma_tarihi: string | null;
  belgeler: unknown;
  // Soruya özel muavinler — 20260519 migration (sorulara_muavin_listesi)
  muavinler?: SoruMuavin[];
  // Etiketler — kavram (sermaye-konulmasi) + hesap kodu (100, 500)
  etiketler?: string[];
  // Katkıcı sistemi — 20260504000010 migration (yazar)
  ekleyen_id: string | null;
  created_at: string;
  updated_at: string;
};

export type UniteKonusuRow = {
  id: string;
  unite_id: string;
  ad: string;
  aciklama: string | null;
  icerik: unknown | null;
  icerik_guncellendi: string | null;
  sira: number;
  // 20260516000007 — aktif/pasif kontrolü
  aktif: boolean;
  created_at: string;
  updated_at: string;
};

export type ModulZorlukDb = 'baslangic' | 'orta' | 'ileri' | 'sinav';

export type UniteModuluRow = {
  id: string;
  unite_id: string;
  sira: number;
  baslik: string;
  aciklama: string | null;
  zorluk_seviyesi: ModulZorlukDb;
  opsiyonel: boolean;
  // 20260515000009 — modül seviyesi BlockNote içerik
  icerik: unknown | null;
  icerik_guncellendi: string | null;
  // 20260516000007 — aktif/pasif kontrolü
  aktif: boolean;
  created_at: string;
  updated_at: string;
};

export type ModulAltBaslikRow = {
  id: string;
  modul_id: string;
  sira: number;
  baslik: string;
  karma: boolean;
  // 20260515000009 — alt başlık seviyesi BlockNote içerik
  icerik: unknown | null;
  icerik_guncellendi: string | null;
  // 20260516000007 — aktif/pasif kontrolü
  aktif: boolean;
  created_at: string;
  updated_at: string;
};

export type CozumlerRow = {
  id: string;
  soru_id: string;
  sira: number;
  kod: string;
  borc: number;
  alacak: number;
};

export type RozetlerKatalogRow = {
  id: string;
  ad: string;
  aciklama: string;
  icon: string;
  sira: number;
};

export type KullaniciRow = {
  id: string;
  kullanici_adi: string;
  email: string | null;
  // Ad/Soyad — onboarding'de zorunlu (20260510000001 migration)
  ad: string | null;
  soyad: string | null;
  tema: 'light' | 'dark';
  premium_bitis: string | null;
  gunluk_limit_reset: string | null;
  gunluk_cozum_sayisi: number;
  // Profil — onboarding ve profil sayfasında doldurulur (20260427000001 migration)
  universite: string | null;
  bolum: string | null;
  sinif: '1' | '2' | '3' | '4' | 'mezun' | 'diger' | null;
  hedef: 'vize-final' | 'kpss' | 'genel' | 'belirsiz' | null;
  dogum_yili: number | null;
  avatar_url: string | null;
  bulten_izni: boolean;
  kvkk_kabul_tarihi: string | null;
  // Moderasyon — 20260504000006 migration
  banli: boolean;
  ban_sebep: string | null;
  ban_tarihi: string | null;
  // Katkıcı sistemi — 20260504000010 migration
  is_katkici: boolean;
  // Admin/kullanıcı kimlik ayrımı — 20260507000004 migration
  // true → leaderboard ve istatistik dışı; bu hesap sadece admin işleri için
  admin_only: boolean;
  // Onboarding tamam mı? — 20260507000007 migration
  // null = henüz tamamlamadı, timestamp = ne zaman tamamlandı
  onboarding_tamam_at: string | null;
  created_at: string;
  updated_at: string;
};

export type IlerlemeRow = {
  id: string;
  user_id: string;
  soru_id: string;
  dogru_mu: boolean;
  sure_saniye: number | null;
  // 20260503000007 migration — yardım takibi + best-score puanlama
  kullanilan_ai: boolean;
  cozum_gosterildi: boolean;
  kazanilan_puan: number | null;
  created_at: string;
};

export type KazanilanRozetRow = {
  user_id: string;
  rozet_id: string;
  kazanilan_tarih: string;
};

export type AktiviteRow = {
  user_id: string;
  tarih: string;
  cozulen_sayi: number;
};

export type OdemeRow = {
  id: string;
  user_id: string;
  iyzico_ref: string | null;
  tutar: number;
  para_birimi: string;
  donem: OdemeDonem;
  durum: OdemeDurum;
  basarili_tarih: string | null;
  ham_yanit: unknown;
  created_at: string;
  conversation_id: string | null;
  plan_kodu: string | null;
  callback_token: string | null;
  hata_mesaji: string | null;
  /** Bulk/kurum ödeme için kullanıcı sayısı; bireysel için 1. */
  adet: number;
  /** İndirim kodu kullanıldıysa kodun id'si. */
  indirim_id: string | null;
  /** İndirim yüzdesi (0-100). */
  indirim_yuzde: number | null;
  /** İndirim öncesi tutar (audit için). */
  indirim_oncesi_tutar: number | null;
};

export type IndirimKoduRow = {
  id: string;
  kod: string;
  indirim_yuzde: number;
  max_kullanim: number | null;
  bitis_tarihi: string | null;
  aktif: boolean;
  aciklama: string | null;
  plan_kodu: string | null;
  created_at: string;
  olusturan_id: string | null;
};

export type IndirimKullanimRow = {
  id: string;
  indirim_id: string;
  user_id: string;
  odeme_id: string | null;
  kullanildi_at: string;
};

export type AdminLogRow = {
  id: string;
  admin_id: string | null;
  admin_email: string;
  islem: string;
  hedef_user_id: string | null;
  hedef_email: string | null;
  detay: Record<string, unknown> | null;
  yapilan_at: string;
};

export type PlanRow = {
  kod: string;
  ad: string;
  aciklama: string | null;
  donem: OdemeDonem;
  ay_sayisi: number;
  tutar: number;
  para_birimi: string;
  aktif: boolean;
  sira: number;
};

export type MevzuatChunkRow = {
  id: string;
  kaynak: string;
  baslik: string;
  url: string | null;
  metin: string;
  embedding: unknown;          // pgvector — TS tarafında opaque
  guncellendi: string | null;
  created_at: string;
};

export type SoruHataRow = {
  id: string;
  soru_id: string;
  user_id: string | null;
  aciklama: string;
  durum: 'acik' | 'incelemede' | 'duzeltildi' | 'reddedildi';
  created_at: string;
};

export type BildirimTip = 'duyuru' | 'bilgi' | 'uyari' | 'guncelleme';
export type BildirimHedefTipi = 'herkes' | 'premium' | 'free' | 'belirli';

export type AdminRol = 'super' | 'icerik' | 'operasyon';

export type AdminRow = {
  user_id: string;
  email: string;
  eklenen_at: string;
  ekleyen_id: string | null;
  roller: AdminRol[];
};

export type KatkiciUnvan = 'akademisyen' | 'ymm' | 'smmm';
export type KatkiciDurum = 'beklemede' | 'onayli' | 'reddedildi';

export type KatkiciBasvuruRow = {
  id: string;
  user_id: string;
  ad_soyad: string;
  unvan: KatkiciUnvan;
  kurum: string;
  iletisim_email: string;
  aciklama: string | null;
  durum: KatkiciDurum;
  red_sebep: string | null;
  created_at: string;
  karar_at: string | null;
  karar_veren_id: string | null;
};

export type BildirimRow = {
  id: string;
  baslik: string;
  metin: string;
  tip: BildirimTip;
  link: string | null;
  yayinda: boolean;
  hedef_tipi: BildirimHedefTipi;
  olusturan_id: string | null;
  created_at: string;
};

export type BildirimHedefRow = {
  bildirim_id: string;
  user_id: string;
};

export type BildirimOkunduRow = {
  bildirim_id: string;
  user_id: string;
  okundu_at: string;
};

export type SozlukTerimiRow = {
  slug: string;
  baslik: string;
  kisa_aciklama: string;
  uzun_icerik: string;
  ornek: string | null;
  ilgili_terimler: string[];
  ilgili_unite_ids: number[];
  ilgili_hesap_kodlari: string[];
  goruntuleme_sayisi: number;
  yayinda: boolean;
  created_at: string;
  updated_at: string;
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '12';
  };
  public: {
    Tables: {
      hesap_plani: {
        Row: HesapPlaniRow;
        Insert: HesapPlaniRow;
        Update: Partial<HesapPlaniRow>;
        Relationships: [];
      };
      adminler: {
        Row: AdminRow;
        Insert: Omit<AdminRow, 'eklenen_at' | 'ekleyen_id'> & {
          eklenen_at?: string;
          ekleyen_id?: string | null;
        };
        Update: Partial<AdminRow>;
        Relationships: [];
      };
      muavin_hesaplar: {
        Row: MuavinHesapRow;
        Insert: Omit<MuavinHesapRow, 'created_at' | 'updated_at' | 'aciklama' | 'sira' | 'aktif'> & {
          created_at?: string;
          updated_at?: string;
          aciklama?: string | null;
          sira?: number;
          aktif?: boolean;
        };
        Update: Partial<MuavinHesapRow>;
        Relationships: [];
      };
      atolye_sorulari: {
        Row: AtolyeSoruRow;
        Insert: Omit<AtolyeSoruRow, 'eklenme' | 'sira'> & {
          sira?: number;
          eklenme?: string;
        };
        Update: Partial<AtolyeSoruRow>;
        Relationships: [];
      };
      unites: {
        Row: UnitesRow;
        Insert: Omit<UnitesRow, 'created_at' | 'icerik' | 'icerik_guncellendi' | 'aktif'> & {
          created_at?: string;
          icerik?: unknown | null;
          icerik_guncellendi?: string | null;
          aktif?: boolean;
        };
        Update: Partial<UnitesRow>;
        Relationships: [];
      };
      sorular: {
        Row: SorularRow;
        Insert: Omit<SorularRow, 'created_at' | 'updated_at' | 'belgeler' | 'durum' | 'ekleyen_id' | 'alt_baslik_id'> & {
          created_at?: string;
          updated_at?: string;
          belgeler?: unknown;
          durum?: SoruDurum;
          ekleyen_id?: string | null;
          alt_baslik_id?: string | null;
        };
        Update: Partial<SorularRow>;
        Relationships: [];
      };
      katkici_basvurulari: {
        Row: KatkiciBasvuruRow;
        Insert: Omit<KatkiciBasvuruRow, 'id' | 'created_at' | 'durum' | 'red_sebep' | 'karar_at' | 'karar_veren_id' | 'kurum' | 'iletisim_email'> & {
          id?: string;
          created_at?: string;
          durum?: KatkiciDurum;
          red_sebep?: string | null;
          karar_at?: string | null;
          karar_veren_id?: string | null;
          kurum?: string | null;
          iletisim_email?: string | null;
        };
        Update: Partial<KatkiciBasvuruRow>;
        Relationships: [];
      };
      cozumler: {
        Row: CozumlerRow;
        Insert: Omit<CozumlerRow, 'id'> & { id?: string };
        Update: Partial<CozumlerRow>;
        Relationships: [];
      };
      rozetler_katalog: {
        Row: RozetlerKatalogRow;
        Insert: RozetlerKatalogRow;
        Update: Partial<RozetlerKatalogRow>;
        Relationships: [];
      };
      kullanicilar: {
        Row: KullaniciRow;
        Insert: Omit<KullaniciRow, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<KullaniciRow>;
        Relationships: [];
      };
      ilerleme: {
        Row: IlerlemeRow;
        Insert: Omit<
          IlerlemeRow,
          | 'id'
          | 'created_at'
          | 'sure_saniye'
          | 'kullanilan_ai'
          | 'cozum_gosterildi'
          | 'kazanilan_puan'
        > & {
          id?: string;
          created_at?: string;
          sure_saniye?: number | null;
          kullanilan_ai?: boolean;
          cozum_gosterildi?: boolean;
          kazanilan_puan?: number | null;
        };
        Update: Partial<IlerlemeRow>;
        Relationships: [];
      };
      kazanilan_rozetler: {
        Row: KazanilanRozetRow;
        Insert: Omit<KazanilanRozetRow, 'kazanilan_tarih'> & { kazanilan_tarih?: string };
        Update: Partial<KazanilanRozetRow>;
        Relationships: [];
      };
      aktivite: {
        Row: AktiviteRow;
        Insert: AktiviteRow;
        Update: Partial<AktiviteRow>;
        Relationships: [];
      };
      odemeler: {
        Row: OdemeRow;
        Insert: Omit<OdemeRow, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<OdemeRow>;
        Relationships: [];
      };
      soru_hatalari: {
        Row: SoruHataRow;
        Insert: Omit<SoruHataRow, 'id' | 'created_at' | 'durum'> & {
          id?: string;
          created_at?: string;
          durum?: SoruHataRow['durum'];
        };
        Update: Partial<SoruHataRow>;
        Relationships: [];
      };
      planlar: {
        Row: PlanRow;
        Insert: PlanRow;
        Update: Partial<PlanRow>;
        Relationships: [];
      };
      mevzuat_chunklar: {
        Row: MevzuatChunkRow;
        Insert: Omit<MevzuatChunkRow, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<MevzuatChunkRow>;
        Relationships: [];
      };
      unite_konulari: {
        Row: UniteKonusuRow;
        Insert: Omit<UniteKonusuRow, 'created_at' | 'updated_at' | 'icerik' | 'icerik_guncellendi' | 'aciklama' | 'sira' | 'aktif'> & {
          created_at?: string;
          updated_at?: string;
          icerik?: unknown | null;
          icerik_guncellendi?: string | null;
          aciklama?: string | null;
          sira?: number;
          aktif?: boolean;
        };
        Update: Partial<UniteKonusuRow>;
        Relationships: [];
      };
      unite_modulleri: {
        Row: UniteModuluRow;
        Insert: Omit<
          UniteModuluRow,
          | 'created_at'
          | 'updated_at'
          | 'aciklama'
          | 'sira'
          | 'zorluk_seviyesi'
          | 'opsiyonel'
          | 'icerik'
          | 'icerik_guncellendi'
          | 'aktif'
        > & {
          created_at?: string;
          updated_at?: string;
          aciklama?: string | null;
          sira?: number;
          zorluk_seviyesi?: ModulZorlukDb;
          opsiyonel?: boolean;
          icerik?: unknown | null;
          icerik_guncellendi?: string | null;
          aktif?: boolean;
        };
        Update: Partial<UniteModuluRow>;
        Relationships: [];
      };
      modul_alt_basliklari: {
        Row: ModulAltBaslikRow;
        Insert: Omit<
          ModulAltBaslikRow,
          | 'created_at'
          | 'updated_at'
          | 'sira'
          | 'karma'
          | 'icerik'
          | 'icerik_guncellendi'
          | 'aktif'
        > & {
          created_at?: string;
          updated_at?: string;
          sira?: number;
          karma?: boolean;
          icerik?: unknown | null;
          icerik_guncellendi?: string | null;
          aktif?: boolean;
        };
        Update: Partial<ModulAltBaslikRow>;
        Relationships: [];
      };
      bildirimler: {
        Row: BildirimRow;
        Insert: Omit<BildirimRow, 'id' | 'created_at' | 'olusturan_id' | 'tip' | 'link' | 'yayinda' | 'hedef_tipi'> & {
          id?: string;
          created_at?: string;
          olusturan_id?: string | null;
          tip?: BildirimTip;
          link?: string | null;
          yayinda?: boolean;
          hedef_tipi?: BildirimHedefTipi;
        };
        Update: Partial<BildirimRow>;
        Relationships: [];
      };
      bildirim_hedef: {
        Row: BildirimHedefRow;
        Insert: BildirimHedefRow;
        Update: Partial<BildirimHedefRow>;
        Relationships: [];
      };
      bildirim_okundu: {
        Row: BildirimOkunduRow;
        Insert: Omit<BildirimOkunduRow, 'okundu_at'> & { okundu_at?: string };
        Update: Partial<BildirimOkunduRow>;
        Relationships: [];
      };
      sozluk_terimleri: {
        Row: SozlukTerimiRow;
        Insert: Omit<
          SozlukTerimiRow,
          | 'created_at'
          | 'updated_at'
          | 'goruntuleme_sayisi'
          | 'yayinda'
          | 'ilgili_terimler'
          | 'ilgili_unite_ids'
          | 'ilgili_hesap_kodlari'
          | 'ornek'
        > & {
          created_at?: string;
          updated_at?: string;
          goruntuleme_sayisi?: number;
          yayinda?: boolean;
          ilgili_terimler?: string[];
          ilgili_unite_ids?: number[];
          ilgili_hesap_kodlari?: string[];
          ornek?: string | null;
        };
        Update: Partial<SozlukTerimiRow>;
        Relationships: [];
      };
      indirim_kodlari: {
        Row: IndirimKoduRow;
        Insert: Omit<IndirimKoduRow, 'id' | 'created_at' | 'olusturan_id' | 'aktif'> & {
          id?: string;
          created_at?: string;
          olusturan_id?: string | null;
          aktif?: boolean;
        };
        Update: Partial<IndirimKoduRow>;
        Relationships: [];
      };
      indirim_kullanimlari: {
        Row: IndirimKullanimRow;
        Insert: Omit<IndirimKullanimRow, 'id' | 'kullanildi_at'> & {
          id?: string;
          kullanildi_at?: string;
        };
        Update: Partial<IndirimKullanimRow>;
        Relationships: [];
      };
      admin_log: {
        Row: AdminLogRow;
        Insert: Omit<AdminLogRow, 'id' | 'yapilan_at'> & {
          id?: string;
          yapilan_at?: string;
        };
        Update: Partial<AdminLogRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      premium_kontenjan_kalan: {
        Args: Record<string, never>;
        Returns: number;
      };
      premium_erken_erisim_aktive: {
        Args: Record<string, never>;
        Returns: string;
      };
      kullanici_adi_uygun: {
        Args: { _ad: string };
        Returns: boolean;
      };
      sozluk_goruntule: {
        Args: { _slug: string };
        Returns: void;
      };
      hesap_sil: {
        Args: Record<string, never>;
        Returns: void;
      };
      admin_premium_ayarla: {
        Args: { _user_id: string; _yeni_bitis: string | null };
        Returns: string | null;
      };
      admin_kullanici_banla: {
        Args: { _user_id: string; _sebep: string };
        Returns: void;
      };
      admin_kullanici_unbanla: {
        Args: { _user_id: string };
        Returns: void;
      };
      admin_kullanici_sil: {
        Args: { _user_id: string };
        Returns: void;
      };
      admin_ekle: {
        Args: { _user_id: string; _roller?: AdminRol[] };
        Returns: void;
      };
      admin_cikar: {
        Args: { _user_id: string };
        Returns: void;
      };
      admin_rolleri_guncelle: {
        Args: { _user_id: string; _roller: AdminRol[] };
        Returns: void;
      };
      admin_ilerleme_sifirla: {
        Args: { _user_id: string };
        Returns: void;
      };
      katkici_basvur: {
        Args: {
          _ad_soyad: string;
          _unvan: KatkiciUnvan;
          _kurum: string;
          _iletisim_email: string;
          _aciklama: string | null;
        };
        Returns: string;
      };
      admin_katkici_onayla: {
        Args: { _basvuru_id: string };
        Returns: void;
      };
      admin_katkici_reddet: {
        Args: { _basvuru_id: string; _sebep: string };
        Returns: void;
      };
      admin_katkici_yetki_kaldir: {
        Args: { _user_id: string };
        Returns: void;
      };
      indirim_dogrula: {
        Args: { _kod: string; _plan_kodu?: string | null };
        Returns: {
          gecerli: boolean;
          indirim_yuzde: number;
          sebep: string;
          indirim_id: string | null;
        }[];
      };
      indirim_kullan_ucretsiz: {
        Args: { _kod: string; _plan_kodu: string };
        Returns: {
          basarili: boolean;
          yeni_premium_bitis: string | null;
          hata: string | null;
        }[];
      };
      admin_indirim_kullanim_sayisi: {
        Args: { _indirim_id: string };
        Returns: number;
      };
    };
    Enums: {
      soru_durum: SoruDurum;
      zorluk: Zorluk;
      odeme_durum: OdemeDurum;
      odeme_donem: OdemeDonem;
    };
  };
};
