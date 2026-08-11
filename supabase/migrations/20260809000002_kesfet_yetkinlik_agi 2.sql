-- Keşfet yetkinlik ağı: Temeller → Yetkinlikler → Fonksiyonel/Sektörel Uzmanlıklar
-- Yalnız tip='kesfet' kayıtlarını additive upsert ile genişletir.
-- Mevcut kart/bölüm/item kimliklerini, kullanıcı içeriğini ve ilerlemeyi korur.

begin;

alter table public.kesfet_kartlar drop constraint if exists kesfet_kartlar_durum_check;
alter table public.kesfet_kartlar
  add column if not exists uzmanlik_turu text,
  add column if not exists on_kosul_sluglari text[] not null default '{}',
  add column if not exists onerilen_on_kosul_sluglari text[] not null default '{}';

alter table public.kesfet_itemler
  add column if not exists yayin_durumu text not null default 'yayinlandi';
alter table public.kesfet_itemler alter column yayin_durumu set default 'taslak';

alter table public.kesfet_kartlar
  drop constraint if exists kesfet_kartlar_uzmanlik_turu_check;
alter table public.kesfet_kartlar
  add constraint kesfet_kartlar_durum_check check (durum in ('acik','yakinda','gizli')),
  add constraint kesfet_kartlar_uzmanlik_turu_check
    check (uzmanlik_turu is null or uzmanlik_turu in ('fonksiyonel','sektorel'));
alter table public.kesfet_itemler drop constraint if exists kesfet_itemler_yayin_durumu_check;
alter table public.kesfet_itemler add constraint kesfet_itemler_yayin_durumu_check
  check (yayin_durumu in ('taslak','incelemede','yayinlandi','arsiv'));

create table if not exists public.kesfet_kart_on_kosullari (
  kart_id uuid not null references public.kesfet_kartlar(id) on delete cascade,
  on_kosul_kart_id uuid not null references public.kesfet_kartlar(id) on delete restrict,
  tur text not null default 'zorunlu' check (tur in ('zorunlu','onerilen')),
  created_at timestamptz not null default now(),
  primary key (kart_id,on_kosul_kart_id,tur),
  check (kart_id <> on_kosul_kart_id)
);

create table if not exists public.kesfet_item_sorulari (
  item_id uuid not null references public.kesfet_itemler(id) on delete cascade,
  soru_id text not null references public.sorular(id) on delete restrict,
  sira int not null default 0,
  zorunlu boolean not null default true,
  minimum_basari smallint not null default 100 check (minimum_basari between 0 and 100),
  destek_seviyesi public.destek_seviyesi not null default 'standart',
  created_at timestamptz not null default now(),
  primary key (item_id,soru_id)
);

create index if not exists kesfet_kart_on_kosullari_hedef_idx on public.kesfet_kart_on_kosullari(on_kosul_kart_id);
create index if not exists kesfet_item_sorulari_soru_idx on public.kesfet_item_sorulari(soru_id);

create or replace function public.kesfet_on_kosul_dongu_engelle()
returns trigger language plpgsql set search_path=public as $$
begin
  if exists (
    with recursive zincir(kart_id) as (
      select new.on_kosul_kart_id
      union
      select x.on_kosul_kart_id from public.kesfet_kart_on_kosullari x join zincir z on x.kart_id=z.kart_id
    ) select 1 from zincir where kart_id=new.kart_id
  ) then
    raise exception 'Keşfet ön koşul ağı döngü içeremez';
  end if;
  return new;
end $$;
drop trigger if exists kesfet_on_kosul_dongu_kontrol on public.kesfet_kart_on_kosullari;
create trigger kesfet_on_kosul_dongu_kontrol before insert or update on public.kesfet_kart_on_kosullari
for each row execute function public.kesfet_on_kosul_dongu_engelle();

alter table public.kesfet_kart_on_kosullari enable row level security;
alter table public.kesfet_item_sorulari enable row level security;
drop policy if exists "kesfet_kart_on_kosullari_read" on public.kesfet_kart_on_kosullari;
create policy "kesfet_kart_on_kosullari_read" on public.kesfet_kart_on_kosullari for select using (
  public.is_admin() or (
    exists(select 1 from public.kesfet_kartlar k where k.id=kart_id and k.durum<>'gizli')
    and exists(select 1 from public.kesfet_kartlar o where o.id=on_kosul_kart_id and o.durum<>'gizli')
  )
);
drop policy if exists "kesfet_kart_on_kosullari_admin" on public.kesfet_kart_on_kosullari;
create policy "kesfet_kart_on_kosullari_admin" on public.kesfet_kart_on_kosullari for all using (public.is_admin('icerik')) with check (public.is_admin('icerik'));
drop policy if exists "kesfet_item_sorulari_read" on public.kesfet_item_sorulari;
create policy "kesfet_item_sorulari_read" on public.kesfet_item_sorulari for select using (
  public.is_admin('icerik') or (
    exists(select 1 from public.sorular s where s.id=soru_id and s.durum='onayli')
    and exists(select 1 from public.kesfet_itemler i where i.id=item_id and i.yayin_durumu='yayinlandi')
  )
);
drop policy if exists "kesfet_item_sorulari_admin" on public.kesfet_item_sorulari;
create policy "kesfet_item_sorulari_admin" on public.kesfet_item_sorulari for all using (public.is_admin('icerik')) with check (public.is_admin('icerik'));

create or replace function pg_temp.sabit_uuid(p_key text) returns uuid language sql immutable as $$
  select (substr(md5(p_key),1,8)||'-'||substr(md5(p_key),9,4)||'-4'||substr(md5(p_key),14,3)||'-a'||substr(md5(p_key),18,3)||'-'||substr(md5(p_key),21,12))::uuid
$$;

create or replace function pg_temp.metin(p_id text, p_text text, p_term text default null)
returns jsonb language sql immutable as $$
  select jsonb_build_object('id',p_id,'type','paragraph','props',jsonb_build_object(),
    'content',jsonb_build_array(jsonb_build_object('type','text','text',p_text,'styles',case when p_term is null then '{}'::jsonb else jsonb_build_object('term',p_term) end)),
    'children',jsonb_build_array())
$$;

create or replace function pg_temp.baslik(p_id text, p_text text)
returns jsonb language sql immutable as $$
  select jsonb_build_object('id',p_id,'type','heading','props',jsonb_build_object('level',2),
    'content',jsonb_build_array(jsonb_build_object('type','text','text',p_text,'styles',jsonb_build_object())),'children',jsonb_build_array())
$$;

create or replace function pg_temp.ders(
  p_kod text, p_amac text, p_kazanim text, p_vaka text, p_mantik text,
  p_soru text, p_siklar jsonb, p_aciklama text, p_tablo text default null,
  p_mevzuat text default null
) returns jsonb language sql as $$
  select jsonb_build_array(
    pg_temp.baslik(p_kod||'-a','Öğrenme amacı'),
    pg_temp.metin(p_kod||'-a1',p_amac),
    pg_temp.baslik(p_kod||'-k','İş başında'),
    pg_temp.metin(p_kod||'-k1',p_kazanim),
    jsonb_build_object('id',p_kod||'-v','type','quote','props',jsonb_build_object(),'content',jsonb_build_array(jsonb_build_object('type','text','text',p_vaka,'styles',jsonb_build_object())),'children',jsonb_build_array()),
    pg_temp.baslik(p_kod||'-m','Mantığı kur'),
    pg_temp.metin(p_kod||'-m1',p_mantik)
  )
  || case when p_tablo is null then '[]'::jsonb else jsonb_build_array(pg_temp.metin(p_kod||'-t',p_tablo)) end
  || case when p_mevzuat is null then '[]'::jsonb else jsonb_build_array(pg_temp.metin(p_kod||'-z',p_mevzuat,'Bu kavramın mevzuat ve uygulama bağlamını aç.')) end
  || jsonb_build_array(
    jsonb_build_object('id',p_kod||'-q','type','kontrol','props',jsonb_build_object('soru',p_soru,'siklar',p_siklar::text,'aciklama',p_aciklama,'ipucu','Olayda gerçekte neyin değiştiğini söyle.'),'children',jsonb_build_array())
  );
$$;

create or replace function pg_temp.kart(p_slug text,p_ad text,p_aciklama text,p_ikon text,p_kategori text,p_durum text,p_sira int,p_uzmanlik text default null,p_on text[] default '{}',p_onerilen text[] default '{}')
returns uuid language plpgsql as $$
declare v uuid; begin
  select id into v from public.kesfet_kartlar where slug=p_slug;
  if v is null then
    v:=pg_temp.sabit_uuid('kart:'||p_slug);
    insert into public.kesfet_kartlar(id,slug,ad,aciklama,ikon,kategori,tip,durum,sira,uzmanlik_turu,on_kosul_sluglari,onerilen_on_kosul_sluglari)
    values(v,p_slug,p_ad,p_aciklama,p_ikon,p_kategori,'kesfet',p_durum,p_sira,p_uzmanlik,p_on,p_onerilen);
  else
    update public.kesfet_kartlar set ad=p_ad,aciklama=p_aciklama,ikon=p_ikon,kategori=p_kategori,
      durum=p_durum,sira=p_sira,uzmanlik_turu=p_uzmanlik,on_kosul_sluglari=p_on,
      onerilen_on_kosul_sluglari=p_onerilen where id=v and tip='kesfet';
  end if;
  return v;
end $$;

create or replace function pg_temp.bolum(p_kart uuid,p_slug text,p_ad text,p_sira int) returns uuid language plpgsql as $$
declare v uuid; begin
  select id into v from public.kesfet_bolumler where kart_id=p_kart and ad=p_ad order by created_at limit 1;
  if v is null then v:=pg_temp.sabit_uuid('bolum:'||p_slug||':'||p_sira); insert into public.kesfet_bolumler(id,kart_id,ad,sira) values(v,p_kart,p_ad,p_sira);
  else update public.kesfet_bolumler set sira=p_sira where id=v; end if; return v;
end $$;

create or replace function pg_temp.item(p_bolum uuid,p_slug text,p_ad text,p_tip text,p_sira int,p_icerik jsonb) returns uuid language plpgsql as $$
declare v uuid; v_icerik jsonb; begin
  select i.id,i.icerik into v,v_icerik from public.kesfet_itemler i join public.kesfet_bolumler b on b.id=i.bolum_id join public.kesfet_kartlar k on k.id=b.kart_id where k.slug=p_slug and i.ad=p_ad order by i.created_at limit 1;
  if v is null then v:=pg_temp.sabit_uuid('item:'||p_slug||':'||p_ad); insert into public.kesfet_itemler(id,bolum_id,ad,tip,sira,icerik,icerik_guncellendi,yayin_durumu) values(v,p_bolum,p_ad,p_tip,p_sira,p_icerik,now(),'yayinlandi');
  else update public.kesfet_itemler set bolum_id=p_bolum,tip=p_tip,sira=p_sira,yayin_durumu='yayinlandi',icerik=case when coalesce(jsonb_array_length(v_icerik),0)=0 then p_icerik else v_icerik end,icerik_guncellendi=case when coalesce(jsonb_array_length(v_icerik),0)=0 then now() else icerik_guncellendi end where id=v; end if; return v;
end $$;

do $$
declare k uuid; b uuid; c jsonb;
begin
  k:=pg_temp.kart('muhasebe-baslangic','Muhasebe Temelleri','Belgeden finansal tabloya uzanan muhasebe düşünme sistemini 19 ders ve bir final vakasıyla kur.','BookOpen','Temeller','acik',0);
  b:=pg_temp.bolum(k,'muhasebe-baslangic','Muhasebeyi Anlamak',0);
  perform pg_temp.item(b,'muhasebe-baslangic','Muhasebe Neden Gereklidir?','ders',0,pg_temp.ders('t01','Muhasebenin işletmede hangi soruları cevapladığını ayırt et.','Kayıt talebinin arkasındaki işletme ihtiyacını açıklayabilirsin.','Mavi Kırtasiye’nin sahibi ay sonunda kasada para olmasına rağmen neden kâr edemediğini anlayamıyor.','Tek tek belgeler hareketi kanıtlar; muhasebe bu hareketleri sınıflandırıp borç, varlık, gelir ve gider ilişkisini görünür kılar.','Muhasebenin bu işletmeye sağlayacağı ilk bilgi hangisidir?','[{"metin":"Paranın nereden gelip nereye gittiği","dogru":true},{"metin":"Gelecek ayın satışını kesin bilmek","dogru":false}]','Muhasebe geleceği garanti etmez; gerçekleşen işlemleri karar verilebilir bilgiye dönüştürür.','Finansal tablolar, dağınık işlemleri dönem sonunda karşılaştırılabilir hale getirir.'));
  perform pg_temp.item(b,'muhasebe-baslangic','Muhasebe Nedir?','ders',1,pg_temp.ders('t02','Kaydetme, sınıflandırma, özetleme, raporlama ve yorumlama işlevlerini birbirine bağla.','Bir belgenin muhasebe sürecinde hangi aşamadan geçtiğini söyleyebilirsin.','Aynı gün içinde satış faturası, kira dekontu ve tedarikçi ödemesi geldi.','Belgeler önce kaydedilir, benzer ekonomik unsurlara göre sınıflandırılır, dönem sonunda özetlenir ve raporlanır. Yorum, rapordaki değişimin nedenini araştırır.','Faturaları hesaplara ayırmak hangi işlevdir?','[{"metin":"Sınıflandırma","dogru":true},{"metin":"Tahmin","dogru":false}]','Hesaplar, işlemleri ekonomik niteliğine göre sınıflandırır.'));
  perform pg_temp.item(b,'muhasebe-baslangic','Mali Nitelikteki Olay','ders',2,pg_temp.ders('t03','Muhasebenin konusu olan ve olmayan olayları ayır.','Bir olay için kayıt gerekip gerekmediğine ilk kararı verebilirsin.','İşletme fiyat teklifi aldı, ardından mal teslim edilip fatura düzenlendi.','Teklif tek başına varlık, borç, gelir veya gider yaratmaz. Teslim ve fatura ise işletmenin finansal yapısını ölçülebilir biçimde değiştirir.','Hangisi mali nitelikteki olaydır?','[{"metin":"Vadeli malın teslim alınması","dogru":true},{"metin":"Fiyat teklifi istenmesi","dogru":false}]','Teslim alınan mal stok ve satıcı borcu doğurur.','Olay stokları ve borçları etkilediği için bilançoya taşınır.'));
  perform pg_temp.item(b,'muhasebe-baslangic','Belge','ders',3,pg_temp.ders('t04','Belgeyi olayın kanıtı ve veri kaynağı olarak oku.','Fatura, dekont ve irsaliyenin hangi bilgiyi kanıtladığını ayırabilirsin.','Mal depoya irsaliyeyle geldi; fatura ertesi gün, banka ödemesi bir hafta sonra oluştu.','İrsaliye teslimi, fatura bedel ve vergiyi, dekont para hareketini kanıtlar. Aynı dosyadaki belgeler farklı tarih ve etkileri gösterebilir.','Ödemeyi hangi belge doğrular?','[{"metin":"Banka dekontu","dogru":true},{"metin":"İrsaliye","dogru":false}]','Dekont para hareketinin dış kanıtıdır.',null,'Fatura'));

  b:=pg_temp.bolum(k,'muhasebe-baslangic','İşletmenin Finansal Yapısı',1);
  perform pg_temp.item(b,'muhasebe-baslangic','İşletmenin Varlıkları','ders',0,pg_temp.ders('t05','İşletmenin kontrol ettiği ekonomik değerleri tanı.','Kasa, banka, alacak, stok ve makineleri doğru varlık grubuna yerleştirebilirsin.','Mavi Kırtasiye’nin kasasında 8.000 TL, bankasında 42.000 TL, raflarında 65.000 TL mal var.','Varlık yalnız para değildir. Gelecekte yarar sağlayan ve işletmenin kontrol ettiği değerler farklı hesaplarda izlenir.','Hangisi varlıktır?','[{"metin":"Müşteriden alınacak 12.000 TL","dogru":true},{"metin":"Satıcıya ödenecek 12.000 TL","dogru":false}]','Müşteri alacağı işletmenin tahsil edeceği ekonomik değerdir.','Varlıklar bilançonun varlık tarafında raporlanır.'));
  perform pg_temp.item(b,'muhasebe-baslangic','Varlıkların Kaynakları','ders',1,pg_temp.ders('t06','Varlıkların borç veya özkaynakla finanse edildiğini açıkla.','Bir varlığın hangi kaynaktan geldiğini ayırabilirsin.','İşletmeye ortak 100.000 TL koydu, banka da 50.000 TL kredi verdi.','İki işlem de bankayı artırır; biri ortakların hakkını, diğeri geri ödeme yükümlülüğünü doğurur. Aynı varlık farklı kaynaklardan finanse edilebilir.','Banka kredisi hangi kaynağı artırır?','[{"metin":"Borç","dogru":true},{"metin":"Özkaynak","dogru":false}]','Kredi işletmenin üçüncü kişiye yükümlülüğüdür.'));
  perform pg_temp.item(b,'muhasebe-baslangic','Varlıklar = Kaynaklar','ders',2,pg_temp.ders('t07','Her varlık artışının bir kaynak veya başka varlık değişimiyle dengelendiğini gör.','Basit bir işlemin dengeyi nasıl koruduğunu açıklayabilirsin.','Ortak işletmeye 40.000 TL nakit sermaye koydu.','Kasa 40.000 TL artarken özkaynak da 40.000 TL artar. İşletmenin sahip olduğu değer ile bu değer üzerindeki haklar eşit kalır.','İşlemden sonra eşitliğin iki tarafında ne artar?','[{"metin":"Kasa ve özkaynak","dogru":true},{"metin":"Kasa ve gider","dogru":false}]','Sermaye girişi gider değil, ortakların işletmedeki hakkıdır.'));
  perform pg_temp.item(b,'muhasebe-baslangic','Temel Muhasebe Denklemi','ders',3,pg_temp.ders('t08','Varlıklar = Borçlar + Özkaynak denklemini kullan.','Eksik bilanço unsurunu denklemle hesaplayabilirsin.','Varlıklar 180.000 TL, borçlar 70.000 TL’dir.','Özkaynak, varlıklardan üçüncü kişilere ait borçlar çıkarıldığında kalan haktır: 180.000 - 70.000 = 110.000 TL.','Özkaynak kaç TL’dir?','[{"metin":"110.000 TL","dogru":true},{"metin":"250.000 TL","dogru":false}]','Denklemin iki tarafı 180.000 TL’de eşitlenir.','Denklem bilanço toplamının neden dengede olduğunu açıklar.'));
  perform pg_temp.item(b,'muhasebe-baslangic','İşlemlerin Muhasebe Denklemine Etkisi','ders',4,pg_temp.ders('t09','Bir işlemde artan ve azalan unsurları kayıt yapmadan çöz.','Ekonomik etkiyi hesap seçiminden önce yazabilirsin.','Bankadan 20.000 TL çekilip kasaya kondu.','Kasa artar, banka azalır. Toplam varlık değişmez; yalnız varlığın biçimi değişir. Borç ve özkaynak etkilenmez.','Toplam varlık ne olur?','[{"metin":"Değişmez","dogru":true},{"metin":"20.000 TL artar","dogru":false}]','Bir varlık artarken diğeri aynı tutarda azalır.','Bilanço içindeki dağılım değişir, toplam değişmez.'));
  perform pg_temp.item(b,'muhasebe-baslangic','Gelir, Gider ve Özkaynak','ders',5,pg_temp.ders('t10','Gelir ve giderin dönem sonucunda özkaynağı nasıl değiştirdiğini kur.','Bir işlemin kâr ve özkaynak etkisini yorumlayabilirsin.','İşletme 6.000 TL hizmet geliri elde etti ve 1.500 TL elektrik gideri ödedi.','Gelir özkaynağı artırır, gider azaltır. Diğer etkiler yok sayıldığında dönem sonucu 4.500 TL artar.','Net özkaynak etkisi nedir?','[{"metin":"4.500 TL artış","dogru":true},{"metin":"7.500 TL artış","dogru":false}]','Gelir ve gider birbirinden çıkarılarak dönem sonucu bulunur.','Gelir ve gider gelir tablosunda, dönem sonucu özkaynakta izlenir.'));

  b:=pg_temp.bolum(k,'muhasebe-baslangic','Muhasebe Dili',2);
  perform pg_temp.item(b,'muhasebe-baslangic','Hesap Nedir?','ders',0,pg_temp.ders('t11','Ekonomik unsurların neden ayrı hesaplarda izlendiğini kavra.','Bir işlem için hangi hesapların bilgi taşıdığını seçebilirsin.','Kasa ve banka hareketleri tek “para” başlığında toplandığında gün sonu kasa sayımı karşılaştırılamadı.','Hesap, aynı nitelikteki artış ve azalışları bir arada izler. Kasa ile banka ayrı kanıtlara ve kontrollere sahip olduğu için ayrı hesaplarda tutulur.','POS tahsilatı hangi hesapta izlenir?','[{"metin":"Bankalar","dogru":true},{"metin":"Kasa","dogru":false}]','Fiziksel para kasaya girmedi; işlem bankada iz bırakır.'));
  perform pg_temp.item(b,'muhasebe-baslangic','Hesaplar Neden İki Taraflıdır?','ders',1,pg_temp.ders('t12','Bir hesabın artış ve azalışlarını iki yönde izle.','T-hesabında hareketleri yönlerine göre ayırabilirsin.','Kasa gün içinde hem tahsilat aldı hem ödeme yaptı.','Tek bakiye sonucu gösterir; iki taraflı hesap ise artış ve azalış hareketlerini ayrı ayrı korur. Böylece bakiyenin nasıl oluştuğu denetlenebilir.','İki tarafın temel yararı nedir?','[{"metin":"Artış ve azalışları ayrı izlemek","dogru":true},{"metin":"Her işlemi gelir saymak","dogru":false}]','Hareketlerin yönü korunmadan bakiye kontrol edilemez.'));
  perform pg_temp.item(b,'muhasebe-baslangic','Borç ve Alacak','ders',2,pg_temp.ders('t13','Borç ve alacağı gündelik anlamdan ayırıp kayıt yönü olarak kullan.','Hesap türüne göre artışın hangi tarafa yazılacağını belirleyebilirsin.','Müşteri 5.000 TL borcunu banka üzerinden ödedi.','Banka varlığı arttığı için borç, müşteri alacağı azaldığı için alacak tarafına yazılır. “Borç” her zaman yükümlülük anlamına gelmez.','Bankalar hesabı hangi tarafa yazılır?','[{"metin":"Borç","dogru":true},{"metin":"Alacak","dogru":false}]','Varlık hesabındaki artış borç tarafındadır.'));
  perform pg_temp.item(b,'muhasebe-baslangic','Çift Taraflı Kayıt','ders',3,pg_temp.ders('t14','Her mali olayın en az iki etkisini birlikte kaydet.','Eksik karşı hesabı ekonomik etkiden bulabilirsin.','İşletme bankadan 30.000 TL kredi kullandı.','Banka varlığı ve kredi borcu aynı anda artar. Kayıt iki etkiyi aynı tutarla gösterdiği için borç ve alacak toplamları eşit kalır.','Karşı hesap hangisidir?','[{"metin":"Banka kredileri","dogru":true},{"metin":"Satışlar","dogru":false}]','Para girişi satıştan değil finansmandan doğdu.'));
  perform pg_temp.item(b,'muhasebe-baslangic','Tekdüzen Hesap Planı','ders',4,pg_temp.ders('t15','Hesap planını ezber listesi değil ortak sınıflandırma dili olarak kullan.','Bir ekonomik unsurun önce hesap sınıfını bulabilirsin.','Yeni alınan bilgisayar için “demirbaş”, “bilgisayar” ve “ofis cihazı” adları kullanıldı.','Tekdüzen Hesap Planı aynı nitelikteki işlemlerin ortak hesaplarda izlenmesini sağlar. Önce ekonomik nitelik belirlenir, sonra uygun kod seçilir.','Bilgisayar alımında önce ne belirlenir?','[{"metin":"Ekonomik niteliği","dogru":true},{"metin":"Rastgele hesap kodu","dogru":false}]','Kod, yapılan analizin sonucudur.',null,'Tekdüzen Hesap Planı'));

  b:=pg_temp.bolum(k,'muhasebe-baslangic','Muhasebe Kaydı',3);
  c:=pg_temp.ders('t16','Ekonomik etkiyi tarih, hesap ve tutarla yevmiye kaydına dönüştür.','Basit bir nakit gider kaydını dengeli kurabilirsin.','İşletme 3.000 TL ofis kirasını kasadan ödedi.','Kira gideri artar ve borç tarafına, kasa azalışı alacak tarafına yazılır. Belge tarihi kayıt tarihini; makbuz tutarı iki satırın tutarını belirler.','Kasa hangi taraftadır?','[{"metin":"Alacak","dogru":true},{"metin":"Borç","dogru":false}]','Varlık hesabı Kasa azalıyor.','Gider gelir tablosunu, kasa bilançoyu azaltır.') || jsonb_build_array(jsonb_build_object('id','t16-y','type','kayit','props',jsonb_build_object('senaryo','3.000 TL ofis kirası kasadan ödendi.','tarih','05.08.2026','satirlar','[{"kod":"770","ad":"Genel Yönetim Giderleri","tutar":"3000","tip":"borc"},{"kod":"100","ad":"Kasa","tutar":"3000","tip":"alacak"}]','aciklama','Gider artışı borç, kasa azalışı alacak tarafındadır.','ipucu','Önce gideri, sonra ödeme aracını seç.'),'children',jsonb_build_array()));
  perform pg_temp.item(b,'muhasebe-baslangic','Yevmiye Kaydı','ders',0,c);
  c:=pg_temp.ders('t17','Gerçek belgedeki matrah, vergi ve ödeme bilgisini kayda çevir.','Vadeli alış faturasından hesapları ve tutarları çıkarabilirsin.','Mavi Kırtasiye 24.000 TL mal ve 4.800 TL KDV içeren faturayı vadeli aldı.','Stok ve indirilecek KDV artar; ödeme yapılmadığı için kasa veya banka azalmaz, satıcı borcu doğar. Belge toplamı 28.800 TL’dir.','Bu işlemde hangi hesap kullanılmaz?','[{"metin":"100 Kasa","dogru":true},{"metin":"320 Satıcılar","dogru":false}]','Vadeli işlemde ödeme aracı hareket etmez.','Stok ve KDV bilançoda varlık, satıcılar borç olarak artar.','Fatura') || jsonb_build_array(jsonb_build_object('id','t17-y','type','kayit','props',jsonb_build_object('senaryo','24.000 TL mal ve 4.800 TL KDV vadeli alındı.','tarih','12.08.2026','satirlar','[{"kod":"153","ad":"Ticari Mallar","tutar":"24000","tip":"borc"},{"kod":"191","ad":"İndirilecek KDV","tutar":"4800","tip":"borc"},{"kod":"320","ad":"Satıcılar","tutar":"28800","tip":"alacak"}]','aciklama','Borç ve alacak toplamı 28.800 TL’dir.','ipucu','Matrahı, KDV’yi ve ödeme durumunu ayrı oku.'),'children',jsonb_build_array()));
  perform pg_temp.item(b,'muhasebe-baslangic','Belgelerden Muhasebe Kaydı','ders',1,c);

  b:=pg_temp.bolum(k,'muhasebe-baslangic','Kayıttan Finansal Tabloya',4);
  perform pg_temp.item(b,'muhasebe-baslangic','Büyük Defter ve Mizan','ders',0,pg_temp.ders('t18','Yevmiye kayıtlarının hesaplara aktarılıp mizanda kontrol edilmesini izle.','Bir mizan bakiyesinin hangi hareketlerden oluştuğunu araştırabilirsin.','Ay içindeki üç kasa tahsilatı ve iki kasa ödemesi yevmiye defterine kaydedildi.','Büyük defter aynı hesaba ait hareketleri toplar. Mizan hesapların borç, alacak ve bakiyelerini yan yana getirir; toplam eşitliği mekanik kontrol sağlar.','Mizan eşitse bütün hesaplar kesin doğru mudur?','[{"metin":"Hayır","dogru":true},{"metin":"Evet","dogru":false}]','Yanlış hesap seçimi borç-alacak eşitliğini bozmayabilir.','Mizan, finansal tablo öncesi hesap bakiyelerini verir.'));
  perform pg_temp.item(b,'muhasebe-baslangic','Bilanço ve Gelir Tablosu','ders',1,pg_temp.ders('t19','Hesap bakiyelerini bilanço ve gelir tablosunda doğru yere taşı.','Bir kaydın hangi tabloyu ve kalemi etkilediğini söyleyebilirsin.','Dönem sonunda kasa, banka, stok, borç, sermaye, satış ve kira gideri bakiyeleri hazır.','Varlık, borç ve özkaynak hesapları bilançoya; gelir ve gider hesapları gelir tablosuna gider. Dönem sonucu iki tablo arasında bağ kurar.','Satış geliri önce hangi tabloda görünür?','[{"metin":"Gelir tablosu","dogru":true},{"metin":"Yalnız mizan","dogru":false}]','Satış dönemin performans unsurudur.','Dönem kârı daha sonra bilançoda özkaynağa eklenir.'));

  b:=pg_temp.bolum(k,'muhasebe-baslangic','Final Simülasyonu',5);
  c:=pg_temp.ders('tf','Bir aylık işletme olaylarını belgeden finansal tabloya kadar birlikte çöz.','Sermaye, kredi, alış, satış, tahsilat, ödeme, duran varlık ve ücret işlemlerini tek dosyada kontrol edebilirsin.','Mavi Kırtasiye Ltd. ağustos ayında kuruldu. Ortak sermaye koydu; kredi kullandı; mal aldı ve sattı; müşteriden tahsilat yaptı; tedarikçiye ödeme yaptı; bilgisayar aldı ve personel ücretini tahakkuk ettirdi.','Her olay ayrı belge ve tarihle ele alınır. Önce ekonomik etki yazılır, sonra hesap ve yön seçilir. Ay sonunda büyük defter, mizan, bilanço ve gelir tablosu birbirine bağlanır.','Ay sonu kontrolünde ilk karşılaştırma hangisidir?','[{"metin":"Belgeler ile yevmiye kayıtları","dogru":true},{"metin":"Gelecek ay bütçesi ile kasa","dogru":false}]','Kayıt zinciri belgeyle başlar; eksik veya çift kayıt önce burada bulunur.','Finalde mizan dengesi, bilanço eşitliği ve dönem sonucu birlikte kontrol edilir.','Fatura') || jsonb_build_array(jsonb_build_object('id','tf-y','type','kayit','props',jsonb_build_object('senaryo','Mavi Kırtasiye’nin vadeli mal alışını kaydet: 40.000 TL mal, 8.000 TL KDV.','tarih','08.08.2026','satirlar','[{"kod":"153","ad":"Ticari Mallar","tutar":"40000","tip":"borc"},{"kod":"191","ad":"İndirilecek KDV","tutar":"8000","tip":"borc"},{"kod":"320","ad":"Satıcılar","tutar":"48000","tip":"alacak"}]','aciklama','Belge toplamı satıcı borcunu; matrah ve KDV ayrı varlık hesaplarını oluşturur.','ipucu','Ödeme yoksa kasa ve banka yok.'),'children',jsonb_build_array()));
  perform pg_temp.item(b,'muhasebe-baslangic','Mavi Kırtasiye Ltd. — Bir Aylık Final','alistirma',0,c);

  -- İçeriği üretimde doğrulanmış iki açık Yetkinlik kartı yeniden kurulur.
  k:=pg_temp.kart('gunluk-muhasebe-islemleri','Günlük Muhasebe Operasyonları','Alış, satış, kasa, banka, cari, gider ve duran varlık işlemlerini belge üzerinden kaydet.','Receipt','Yetkinlikler','acik',10,null,array['muhasebe-baslangic']);
  b:=pg_temp.bolum(k,'gunluk-muhasebe-islemleri','Alış ve Satış',0);
  perform pg_temp.item(b,'gunluk-muhasebe-islemleri','Peşin Mal Alışı','ders',0,'[]');
  perform pg_temp.item(b,'gunluk-muhasebe-islemleri','Vadeli Satış ve Tahsilat','ders',1,'[]');
  b:=pg_temp.bolum(k,'gunluk-muhasebe-islemleri','Kasa ve Banka',1); perform pg_temp.item(b,'gunluk-muhasebe-islemleri','Kasa ile Bankayı Ayırmak','ders',0,'[]');
  b:=pg_temp.bolum(k,'gunluk-muhasebe-islemleri','Gün Sonu Kontrolü',2); perform pg_temp.item(b,'gunluk-muhasebe-islemleri','Belge, Kayıt ve Bakiye Kontrolü','alistirma',0,'[]');

  k:=pg_temp.kart('vergi-belge-uygulamalari','Vergi ve Belge Uygulamaları','Belgedeki matrah, KDV ve ödeme bilgisini ayır; kayıt ve belge kontrollerini uygula.','FileCheck','Yetkinlikler','acik',11,null,array['muhasebe-baslangic']);
  b:=pg_temp.bolum(k,'vergi-belge-uygulamalari','Belgeyi Okumak',0); perform pg_temp.item(b,'vergi-belge-uygulamalari','Faturada Matrah ve KDV','ders',0,'[]'); perform pg_temp.item(b,'vergi-belge-uygulamalari','Fatura, İrsaliye ve Dekontun Rolü','ders',1,'[]');
  b:=pg_temp.bolum(k,'vergi-belge-uygulamalari','KDV Kayıtları',1); perform pg_temp.item(b,'vergi-belge-uygulamalari','İndirilecek KDV Kaydı','ders',0,'[]');
  b:=pg_temp.bolum(k,'vergi-belge-uygulamalari','Belge Kontrol Vakası',2); perform pg_temp.item(b,'vergi-belge-uygulamalari','Eksik Belgede Kayıt Kararı','alistirma',0,'[]');

  -- İçeriği tamamlanmamış kartlarda bölüm/item iskeleti oluşturulmaz.
  perform pg_temp.kart('beyanname-surecleri','Beyanname Süreçleri','Dönem verilerini kontrol listeleriyle beyanname hazırlığına taşı.','CalendarCheck','Yetkinlikler','yakinda',12,null,array['vergi-belge-uygulamalari']);
  perform pg_temp.kart('bordro-sgk','Bordro ve SGK','Brütten nete bordro bileşenlerini, tahakkuku ve ödeme kayıtlarını uygula.','Users','Yetkinlikler','yakinda',13,null,array['muhasebe-baslangic']);
  perform pg_temp.kart('donem-sonu-islemleri','Dönem Sonu İşlemleri','Amortisman, değerleme, stok, tahakkuk ve kapanış kontrollerini yürüt.','Calendar','Yetkinlikler','yakinda',14,null,array['gunluk-muhasebe-islemleri']);
  perform pg_temp.kart('sirket-ticaret-islemleri','Şirket ve Ticaret İşlemleri','Sermaye, ortaklar, kâr dağıtımı ve temel ticaret işlemlerini çöz.','Briefcase','Yetkinlikler','yakinda',15,null,array['muhasebe-baslangic']);

  perform pg_temp.kart('maliyet-muhasebesi','Maliyet Muhasebesi','Maliyet unsurlarını mamul ve sipariş maliyetine taşı.','Factory','Uzmanlıklar','yakinda',20,'fonksiyonel',array['gunluk-muhasebe-islemleri','donem-sonu-islemleri']);
  perform pg_temp.kart('proje-muhasebesi','Proje Muhasebesi ve Proje Kontrolü','Proje maliyetlerini bütçe, gerçekleşen ve kârlılıkla birlikte izle.','Milestone','Uzmanlıklar','yakinda',21,'fonksiyonel',array['gunluk-muhasebe-islemleri']);
  perform pg_temp.kart('ileri-vergi','İleri Vergi Uygulamaları','Vergi olaylarını belge, kayıt ve beyan bağlantısıyla çöz.','Percent','Uzmanlıklar','yakinda',22,'fonksiyonel',array['vergi-belge-uygulamalari','beyanname-surecleri']);
  perform pg_temp.kart('bordro-is-hukuku','Bordro ve İş Hukuku','Ücret, teşvik, kıdem ve iş hukuku bağlantılarını uygula.','Scale','Uzmanlıklar','yakinda',23,'fonksiyonel',array['bordro-sgk']);
  perform pg_temp.kart('finansal-raporlama','Finansal Raporlama / TMS-TFRS','Düzeltilmiş kayıtlardan dipnotlarıyla birlikte finansal rapor üret.','LineChart','Uzmanlıklar','yakinda',24,'fonksiyonel',array['donem-sonu-islemleri']);
  perform pg_temp.kart('yonetim-muhasebesi','Yönetim Muhasebesi ve Finansal Analiz','Bütçe, nakit akışı, KPI ve kârlılık analizleri üret.','ChartNoAxesCombined','Uzmanlıklar','yakinda',25,'fonksiyonel',array['muhasebe-baslangic'],array['finansal-raporlama']);
  perform pg_temp.kart('dis-ticaret-doviz','Dış Ticaret ve Dövizli İşlemler','İthalat, ihracat, döviz ve kur farkı kayıtlarını uygula.','Globe','Uzmanlıklar','yakinda',26,'fonksiyonel',array['vergi-belge-uygulamalari','gunluk-muhasebe-islemleri']);

  perform pg_temp.kart('uretim-muhasebesi','Üretim Muhasebesi','Üretim akışını stok, yarı mamul, mamul ve maliyet kontrolüyle izle.','Factory','Uzmanlıklar','gizli',30,'sektorel',array['maliyet-muhasebesi'],array['donem-sonu-islemleri']);
  perform pg_temp.kart('arge-teknokent','Ar-Ge, Teknokent ve Teşvik Uygulamaları','Proje ve personel maliyetlerini teşvik ve istisna bağlamında izle.','Rocket','Uzmanlıklar','gizli',31,'sektorel',array['ileri-vergi','bordro-is-hukuku','proje-muhasebesi'],array['maliyet-muhasebesi']);
  perform pg_temp.kart('savunma-sanayii','Savunma Sanayii Muhasebe ve Vergi Uygulamaları','Proje, üretim, sözleşme, teşvik ve raporlamayı ileri seviye bir vakada birleştir.','ShieldCheck','Uzmanlıklar','gizli',32,'sektorel',array['maliyet-muhasebesi','proje-muhasebesi','ileri-vergi','bordro-is-hukuku','arge-teknokent'],array['finansal-raporlama','yonetim-muhasebesi','dis-ticaret-doviz']);
  perform pg_temp.kart('insaat-muhasebesi','İnşaat Muhasebesi','Hakediş, proje maliyeti, sözleşme ve dönemsel vergi işlemlerini birlikte izle.','HardHat','Uzmanlıklar','gizli',33,'sektorel',array['proje-muhasebesi','ileri-vergi'],array['donem-sonu-islemleri']);
  perform pg_temp.kart('dis-ticaret-muhasebesi','Dış Ticaret Muhasebesi','Gümrük, KDV, döviz ve kur farkı bağlantılarını dış ticaret dosyasında yönet.','Ship','Uzmanlıklar','gizli',34,'sektorel',array['ileri-vergi','dis-ticaret-doviz'],array['finansal-raporlama']);
end $$;

-- Eski Temeller parçalarını silme: hedef 19 ders ve final dışındaki kayıtları arşivle.
-- Kimlikler ve kesfet_ilerleme satırları korunur; admin arşivde görmeye devam eder.
update public.kesfet_itemler i set yayin_durumu='arsiv'
from public.kesfet_bolumler b join public.kesfet_kartlar k on k.id=b.kart_id
where i.bolum_id=b.id and k.slug='muhasebe-baslangic'
and i.ad not in (
  'Muhasebe Neden Gereklidir?','Muhasebe Nedir?','Mali Nitelikteki Olay','Belge',
  'İşletmenin Varlıkları','Varlıkların Kaynakları','Varlıklar = Kaynaklar','Temel Muhasebe Denklemi',
  'İşlemlerin Muhasebe Denklemine Etkisi','Gelir, Gider ve Özkaynak','Hesap Nedir?',
  'Hesaplar Neden İki Taraflıdır?','Borç ve Alacak','Çift Taraflı Kayıt','Tekdüzen Hesap Planı',
  'Yevmiye Kaydı','Belgelerden Muhasebe Kaydı','Büyük Defter ve Mizan','Bilanço ve Gelir Tablosu',
  'Mavi Kırtasiye Ltd. — Bir Aylık Final'
);

-- Slug dizileri yalnız geçiş girdisidir; çalışma zamanı türlendirilmiş ilişkiden okur.
insert into public.kesfet_kart_on_kosullari(kart_id,on_kosul_kart_id,tur)
select k.id,o.id,'zorunlu' from public.kesfet_kartlar k
cross join lateral unnest(k.on_kosul_sluglari) s(slug)
join public.kesfet_kartlar o on o.slug=s.slug
where k.tip='kesfet' on conflict do nothing;
insert into public.kesfet_kart_on_kosullari(kart_id,on_kosul_kart_id,tur)
select k.id,o.id,'onerilen' from public.kesfet_kartlar k
cross join lateral unnest(k.onerilen_on_kosul_sluglari) s(slug)
join public.kesfet_kartlar o on o.slug=s.slug
where k.tip='kesfet' on conflict do nothing;

-- Altın referans KUR-001 mevcutsa, "Belgelerden Muhasebe Kaydı" dersine ölçümlü görev olarak bağla.
insert into public.kesfet_item_sorulari(item_id,soru_id,sira,zorunlu,minimum_basari,destek_seviyesi)
select i.id,s.id,0,true,100,'standart'
from public.kesfet_itemler i
join public.kesfet_bolumler b on b.id=i.bolum_id
join public.kesfet_kartlar k on k.id=b.kart_id
join public.sorular s on s.id='soru-mal-alis-veresiye-001' and s.durum='onayli'
where k.slug='muhasebe-baslangic' and i.ad in ('Belgelerden Muhasebe Kaydı','Gerçek Belgelerden Muhasebe Kaydı')
on conflict (item_id,soru_id) do update set zorunlu=true,minimum_basari=100,destek_seviyesi='standart';

-- Gizli kartlar ve içerikleri yalnız admin tarafından okunur. Açık/yakında kartlar public kalır.
drop policy if exists "kesfet_kartlar_read" on public.kesfet_kartlar;
create policy "kesfet_kartlar_read" on public.kesfet_kartlar for select
  using (durum <> 'gizli' or public.is_admin());
drop policy if exists "kesfet_bolumler_read" on public.kesfet_bolumler;
create policy "kesfet_bolumler_read" on public.kesfet_bolumler for select
  using (exists(select 1 from public.kesfet_kartlar k where k.id=kart_id and (k.durum <> 'gizli' or public.is_admin())));
drop policy if exists "kesfet_itemler_read" on public.kesfet_itemler;
create policy "kesfet_itemler_read" on public.kesfet_itemler for select
  using (exists(select 1 from public.kesfet_bolumler b join public.kesfet_kartlar k on k.id=b.kart_id where b.id=bolum_id and ((k.durum <> 'gizli' and yayin_durumu='yayinlandi') or public.is_admin())));

commit;
notify pgrst, 'reload schema';

-- Geri dönüş additive yapılır: yeni bağlantı tabloları önce boşaltılır; kolonlar ancak
-- hiçbir uygulama kullanmıyorsa ayrı ve gözden geçirilmiş migration ile kaldırılır.
