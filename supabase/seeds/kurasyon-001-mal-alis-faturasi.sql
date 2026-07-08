-- =====================================================================
-- KÜRASYON-001 — Ticari Mal Alış Faturası (içerik seed)
-- =====================================================================
-- Referans: KURASYON-001-MIMARI-ANALIZ.md
--
-- ⚠️ MIGRATION DEĞİL — İÇERİK SEED: Şema değiştirmez; yalnız veri ekler.
--    M5-M9 zincirini uçtan uca aktifleştiren ilk tam olay. Migration geçmişine
--    GİRMEZ (execute_sql ile uygulanır, apply_migration ile değil).
--
-- İdempotent: on conflict / not exists guard'ları + gerçek mevcut id'lere
--    DOĞAL ANAHTAR lookup'ı (uuid literal gömülmez). Tekrar çalıştırılabilir.
--
-- Sıra (bağımlılık): mevzuat → olay → yetkinlik/etiket → belge → cozum_basligi
--    → cozum_satirlari → cozum_mevzuat → soru.
--
-- Tek transaction: cozum_satirlari deferred denge trigger'ı COMMIT anında
--    Σborç=Σalacak + min-2-satır kontrol eder (3 satır, dengeli → geçer).
--
-- Senaryo: İşletme, Delta Tedarik Ltd. Şti.'den 50.000 TL ticari mal aldı,
--    %20 KDV (10.000), veresiye (30 gün). Toplam 60.000. Aralıklı envanter.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. mevzuat_maddeleri (KİMLİK) + mevzuat_madde_versiyonlari (VERSİYON)
--    cozum_mevzuat'tan ÖNCE (FK). Kaynaklar (kdvk, vuk) M8'de seed'li.
-- ---------------------------------------------------------------------
insert into public.mevzuat_maddeleri (kaynak_id, madde_no) values
  ('kdvk', '29/1'),
  ('vuk',  '229')
on conflict on constraint mevzuat_madde_kimlik_uniq do nothing;

-- KDVK md.29/1 — vergi indirimi (191 İndirilecek KDV dayanağı)
insert into public.mevzuat_madde_versiyonlari (madde_id, versiyon, baslik, metin, effective_date, source_url)
select m.id, 1, 'Vergi İndirimi',
  'Mükellefler, yaptıkları vergiye tabi işlemler üzerinden hesaplanan katma değer vergisinden, faaliyetlerine ilişkin olarak yüklendikleri katma değer vergisini indirebilirler.',
  date '1985-01-01', 'https://www.mevzuat.gov.tr/'
from public.mevzuat_maddeleri m where m.kaynak_id='kdvk' and m.madde_no='29/1'
on conflict on constraint mevzuat_versiyon_uniq do nothing;

-- VUK md.229 — fatura (belge dayanağı)
insert into public.mevzuat_madde_versiyonlari (madde_id, versiyon, baslik, metin, effective_date, source_url)
select m.id, 1, 'Fatura',
  'Fatura, satılan emtia veya yapılan iş karşılığında müşterinin borçlandığı meblağı göstermek üzere emtiayı satan veya işi yapan tüccar tarafından müşteriye verilen ticari vesikadır.',
  date '1961-01-10', 'https://www.mevzuat.gov.tr/'
from public.mevzuat_maddeleri m where m.kaynak_id='vuk' and m.madde_no='229'
on conflict on constraint mevzuat_versiyon_uniq do nothing;

-- ---------------------------------------------------------------------
-- 2. muhasebe_olayi (aggregate root)
-- ---------------------------------------------------------------------
insert into public.muhasebe_olaylari (id, baslik, senaryo, islem_tarihi, zorluk, ipucu, durum, kaynak)
values (
  'olay-mal-alis-veresiye-001',
  'Ticari Mal Alışı (Veresiye)',
  'İşletme, Delta Tedarik Ltd. Şti.''den 50.000 TL tutarında ticari mal satın aldı. Faturada %20 KDV (10.000 TL) hesaplandı. Ödeme 30 gün vadeli olup henüz yapılmamıştır (veresiye). Karşılığında alış faturası düzenlenmiştir.',
  date '2026-03-15',
  'orta',
  'Alışta yüklenilen KDV *indirilecek* KDV''dir; ödeme yapılmadığından toplam borç 320 Satıcılar''da doğar.',
  'onayli',
  'manuel'
)
on conflict (id) do update set
  baslik = excluded.baslik, senaryo = excluded.senaryo, islem_tarihi = excluded.islem_tarihi,
  zorluk = excluded.zorluk, ipucu = excluded.ipucu, durum = excluded.durum;

-- ---------------------------------------------------------------------
-- 3. olay_yetkinlikleri (XP kaynağı — toplam ağırlık = 1.00)
-- ---------------------------------------------------------------------
insert into public.olay_yetkinlikleri (olay_id, yetkinlik_id, agirlik) values
  ('olay-mal-alis-veresiye-001', 'kdv',          0.40),
  ('olay-mal-alis-veresiye-001', 'cari-hesap',   0.20),
  ('olay-mal-alis-veresiye-001', 'belge-okuma',  0.20),
  ('olay-mal-alis-veresiye-001', 'yevmiye-kaydi',0.20)
on conflict (olay_id, yetkinlik_id) do update set agirlik = excluded.agirlik;

-- ---------------------------------------------------------------------
-- 4. olay_etiketleri (filtre/keşif)
-- ---------------------------------------------------------------------
insert into public.olay_etiketleri (olay_id, etiket_id) values
  ('olay-mal-alis-veresiye-001', 'belge'),
  ('olay-mal-alis-veresiye-001', 'kdv'),
  ('olay-mal-alis-veresiye-001', 'cari'),
  ('olay-mal-alis-veresiye-001', 'genel-muhasebe')
on conflict (olay_id, etiket_id) do nothing;

-- ---------------------------------------------------------------------
-- 5. belge (alis_faturasi) + olay_belgeleri
--    cari_id = Delta Tedarik (doğal anahtar lookup). belge_no ile idempotent.
-- ---------------------------------------------------------------------
insert into public.belgeler (belge_tipi, belge_no, tarih, cari_id, yon, matrah, kdv_orani, kdv_tutari, toplam, satirlar, meta)
select
  'alis_faturasi', 'ALS2026-000147', date '2026-03-15', c.id, 'gelen',
  50000.00, 20.00, 10000.00, 60000.00,
  '[{"aciklama":"Ticari Mal","miktar":100,"birim":"Adet","birim_fiyat":500,"iskonto":0}]'::jsonb,
  '{"vade_gun":30}'::jsonb
from public.cari_kartlar c
where c.unvan = 'Delta Tedarik Ltd. Şti.' and c.isletme_id is null
  and not exists (select 1 from public.belgeler b where b.belge_no = 'ALS2026-000147');

insert into public.olay_belgeleri (olay_id, belge_id, sira, rol)
select 'olay-mal-alis-veresiye-001', b.id, 1, 'ana'
from public.belgeler b where b.belge_no = 'ALS2026-000147'
on conflict (olay_id, belge_id) do nothing;

-- ---------------------------------------------------------------------
-- 6. cozum_basligi (cevap anahtarı başlığı — varyant 1)
-- ---------------------------------------------------------------------
insert into public.cozum_basliklari (olay_id, varyant, varyant_adi, aciklama, beyanname_etkileri, hata_kurallari)
values (
  'olay-mal-alis-veresiye-001', 1, 'Aralıklı envanter',
  'Ticari mal alışında mal bedeli 153 Ticari Mallar''a borç yazılır. Yüklenilen KDV *indirilecek* KDV''dir (191, borç) — satıştaki hesaplanan KDV değildir. Ödeme yapılmadığından toplam borç 320 Satıcılar (Delta) hesabında alacak olarak doğar.',
  '[{"beyanname":"KDV1","satir":"İndirilecek KDV","etki":10000}]'::jsonb,
  '[{"yanlis_kod":"391","mesaj":"Alışta 391 Hesaplanan KDV kullanılmaz; yüklenilen KDV 191 İndirilecek KDV''dir."},{"yanlis_kod":"100","dogru":"320","mesaj":"Veresiye alışta karşı hesap 320 Satıcılar''dır; kasa/banka değil."}]'::jsonb
)
on conflict on constraint cozum_baslik_olay_varyant_uniq do update set
  varyant_adi = excluded.varyant_adi, aciklama = excluded.aciklama,
  beyanname_etkileri = excluded.beyanname_etkileri, hata_kurallari = excluded.hata_kurallari;

-- ---------------------------------------------------------------------
-- 7. cozum_satirlari (muavin_id NOT NULL, dengeli: Σborç=Σalacak=60.000)
--    muavin doğal anahtar (kod, global evren) → id lookup.
-- ---------------------------------------------------------------------
insert into public.cozum_satirlari (baslik_id, sira, muavin_id, borc, alacak)
select b.id, v.sira, m.id, v.borc, v.alacak
from public.cozum_basliklari b
cross join (values
  (1, '153.01', 50000.00,     0.00),
  (2, '191.01', 10000.00,     0.00),
  (3, '320.001',    0.00, 60000.00)
) as v(sira, kod, borc, alacak)
join public.muavin_hesaplar m
  on m.kod = v.kod and m.isletme_id is null and m.olusturan_user_id is null
where b.olay_id = 'olay-mal-alis-veresiye-001' and b.varyant = 1
on conflict on constraint cozum_satir_sira_uniq do nothing;

-- ---------------------------------------------------------------------
-- 8. cozum_mevzuat (cozum_basligi ↔ madde KİMLİĞİ)
-- ---------------------------------------------------------------------
insert into public.cozum_mevzuat (baslik_id, madde_id, aciklama)
select b.id, m.id, v.aciklama
from public.cozum_basliklari b
cross join (values
  ('kdvk','29/1','191 İndirilecek KDV''nin dayanağı — indirim hakkı.'),
  ('vuk', '229', 'Kaydın dayanağı fatura belgesidir.')
) as v(kaynak, madde_no, aciklama)
join public.mevzuat_maddeleri m on m.kaynak_id = v.kaynak and m.madde_no = v.madde_no
where b.olay_id = 'olay-mal-alis-veresiye-001' and b.varyant = 1
on conflict (baslik_id, madde_id) do nothing;

-- ---------------------------------------------------------------------
-- 9. Soru instance (olayı çözülebilir kılar — tip=yevmiye_kaydi)
--    Zorunlu: id, unite_id, baslik, zorluk, senaryo. Legacy jsonb'lar (belgeler/
--    muavinler/etiketler) BOŞ bırakılır — yeni içerik normalize yapıyı kullanır.
-- ---------------------------------------------------------------------
insert into public.sorular (id, unite_id, baslik, zorluk, senaryo, ipucu, durum, kaynak, olay_id, tip, destek_seviyesi)
values (
  'soru-mal-alis-veresiye-001',
  'mal-alis-satis',
  'Ticari Mal Alışı (Veresiye)',
  'orta',
  'İşletme, Delta Tedarik Ltd. Şti.''den 50.000 TL tutarında ticari mal satın aldı. Faturada %20 KDV (10.000 TL) hesaplandı. Ödeme 30 gün vadeli (veresiye). Alış faturasını yevmiyeye kaydediniz.',
  'Alışta yüklenilen KDV *indirilecek* KDV''dir; veresiyede karşı hesap 320''dir.',
  'onayli',
  'manuel',
  'olay-mal-alis-veresiye-001',
  'yevmiye_kaydi',
  'standart'
)
on conflict (id) do update set
  olay_id = excluded.olay_id, tip = excluded.tip, destek_seviyesi = excluded.destek_seviyesi,
  durum = excluded.durum, senaryo = excluded.senaryo;

-- ---------------------------------------------------------------------
-- 10. DOĞRULAMA
-- ---------------------------------------------------------------------
do $$
declare
  v_agirlik   numeric;
  v_borc      numeric;
  v_alacak    numeric;
  v_satir     int;
  v_mevzuat   int;
  v_soru_olay text;
begin
  select coalesce(sum(agirlik),0) into v_agirlik
    from public.olay_yetkinlikleri where olay_id='olay-mal-alis-veresiye-001';
  select coalesce(sum(cs.borc),0), coalesce(sum(cs.alacak),0), count(*) into v_borc, v_alacak, v_satir
    from public.cozum_satirlari cs
    join public.cozum_basliklari b on b.id=cs.baslik_id
    where b.olay_id='olay-mal-alis-veresiye-001' and b.varyant=1;
  select count(*) into v_mevzuat
    from public.cozum_mevzuat cm join public.cozum_basliklari b on b.id=cm.baslik_id
    where b.olay_id='olay-mal-alis-veresiye-001';
  select olay_id into v_soru_olay from public.sorular where id='soru-mal-alis-veresiye-001';

  raise notice 'KUR-001 raporu — yetkinlik ağırlık toplamı: %, cozum Σborç: %, Σalacak: %, satır: %, mevzuat bağı: %, soru→olay: %',
    v_agirlik, v_borc, v_alacak, v_satir, v_mevzuat, v_soru_olay;

  if v_agirlik <> 1.00 then
    raise exception 'KUR-001 hata: yetkinlik ağırlık toplamı % (1.00 bekleniyor)', v_agirlik;
  end if;
  if v_borc <> v_alacak or v_borc <> 60000.00 then
    raise exception 'KUR-001 hata: cevap anahtarı dengesiz (Σborç % / Σalacak %)', v_borc, v_alacak;
  end if;
  if v_satir <> 3 then
    raise exception 'KUR-001 hata: cozum_satirlari % (3 bekleniyor)', v_satir;
  end if;
  if v_mevzuat <> 2 then
    raise exception 'KUR-001 hata: cozum_mevzuat bağı % (2 bekleniyor)', v_mevzuat;
  end if;
  if v_soru_olay is distinct from 'olay-mal-alis-veresiye-001' then
    raise exception 'KUR-001 hata: soru olaya bağlanmadı';
  end if;

  raise notice 'KUR-001 doğrulama başarılı ✓ (olay + belge + cevap anahtarı + yetkinlik + mevzuat + soru; M5-M9 zinciri aktif)';
end $$;

commit;

-- PostgREST şema cache yenile (yeni satırlar için gerekmez ama tutarlılık)
notify pgrst, 'reload schema';
