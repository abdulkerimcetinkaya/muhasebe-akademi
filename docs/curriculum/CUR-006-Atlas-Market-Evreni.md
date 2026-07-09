# CUR-006 — Atlas Market Evreni

**Durum:** Taslak v0.1

---

# 1. Belgenin Amacı

Bu belge, Beta sürümünün **referans işletmesi** olan Atlas Market'i tanımlar.

Beta kapsamındaki bütün muhasebe olayları (KUR) bu işletmede geçer. Amaç bir hikâye anlatmak değil; tüm içeriklerde kullanılacak ortak işletme, roller, ticari ilişkiler ve muhasebe politikalarını standartlaştırmaktır.

Böylece her KUR içeriği aynı evreni referans alır; senaryolar birbiriyle tutarlı olur ve kullanıcı tek bir işletmeyi baştan sona deneyimleyerek öğrenir. Bu belge CUR-001 (Vizyon), CUR-002 (Öğrenme Modeli), CUR-005 (İçerik Standardı) ve DD-001…DD-005 kararlarıyla uyumludur.

---

# 2. İşletme Profili

| Alan | Değer |
|---|---|
| İşletme adı | Atlas Market Ticaret Ltd. Şti. |
| Şirket türü | Limited Şirket |
| Faaliyet konusu | Perakende ve toptan gıda / market ürünleri ticareti |
| Ölçek | Küçük–orta ölçekli işletme (KOBİ) |
| E-Fatura | Kullanıyor (e-Fatura / e-Arşiv mükellefi) |
| KDV mükellefiyeti | Gerçek usulde KDV mükellefi |
| Stok takibi | Sürekli envanter yöntemi |
| POS kullanımı | Var (perakende satışlarda banka POS cihazı) |
| Banka kullanımı | Var (tek ticari banka hesabı üzerinden tahsilat ve ödeme) |

İşletme gerçekçi fakat sade tutulmuştur; Beta'nın temel ticari işletme konularını kapsayacak kadar donanımlıdır, gereksiz karmaşıklık içermez.

---

# 3. Organizasyon

İşletmede tanımlı temel roller:

- **İşletme Sahibi / Müdür** — genel yönetim ve karar alma.
- **Muhasebe Sorumlusu** — belgelerin kaydı, mevzuat uyumu, dönem sonu işlemleri.
- **Kasiyer** — perakende satış, kasa ve POS tahsilatları.
- **Depo Sorumlusu** — mal giriş/çıkışı ve stok takibi.

Roller senaryolarda bağlam sağlamak için kullanılır; gereksiz karakter veya kişisel hikâye oluşturulmaz.

---

# 4. Ticari Yapı

Senaryolarda kullanılacak örnek ticari ilişkiler:

**Tedarikçiler**
- Delta Tedarik Ltd. Şti. — ticari mal (gıda ürünleri) tedarikçisi.
- Genel giderler için çeşitli hizmet ve malzeme sağlayıcıları.

**Müşteriler**
- Perakende müşteriler (kasa/POS üzerinden peşin satış).
- Kurumsal müşteriler (faturalı, veresiye satış).

**Banka İlişkileri**
- Tek ticari banka hesabı; havale/EFT ile tahsilat ve ödeme, POS hesaplaşmaları, kredi kartı hesaplaşmaları.

Bu yapı, gerçekçi ve tutarlı senaryolar üretmeye yeterlidir. Not: Delta Tedarik, mevcut KUR-001 (Ticari Mal Alışı) içeriğinde de tedarikçi olarak kullanılmıştır; evren bu içerikle tutarlıdır.

---

# 5. Muhasebe Politikaları

Beta boyunca geçerli varsayımlar:

- Stok değerleme: Sürekli envanter yöntemi.
- Vergi: Gerçek usulde KDV mükellefi.
- Para birimi: Türk Lirası (TL).
- Yapı: Tek şube.
- Hesap planı: Standart Tek Düzen Hesap Planı (TDHP).
- Dönem: Takvim yılı esaslı hesap dönemi.

---

# 6. Belge Ekosistemi

Beta boyunca kullanılacak belge türleri:

- **Alış Faturası** — tedarikçiden mal/hizmet alımının belgesi.
- **Satış Faturası** — müşteriye yapılan satışın belgesi.
- **Banka Dekontu** — havale/EFT, POS ve banka işlemlerinin belgesi.
- **Tahsilat Makbuzu** — müşteriden yapılan tahsilatın belgesi.
- **Tediye Makbuzu** — yapılan ödemenin belgesi.
- **Gider Pusulası** — belgelendirilemeyen alımlarda düzenlenen belge.

Tüm belgeler gerçek GİB formatlarına sadık üretilir (bkz. DD-002).

---

# 7. Öğrenme Kapsamı

Atlas Market üzerinden öğretilecek temel ticari işletme konuları:

- Açılış ve kuruluş kayıtları.
- Ticari mal alışı (peşin ve veresiye).
- Ticari mal satışı (peşin, POS ve veresiye).
- KDV (hesaplanan / indirilecek KDV, KDV mahsubu).
- Tahsilat ve ödeme işlemleri (kasa, banka, POS).
- Ticari alacak ve borç takibi (cari hesaplar).
- Genel giderler ve gider belgeleri.
- Dönem sonu temel işlemleri.

Bu kapsam, "Ticari İşletme" modülünün (CUR-101) sınırlarını netleştirir.

---

# 8. Beta Sınırları

Beta kapsamı bilinçli olarak dardır. Aşağıdaki alanlar Beta'da **YOKTUR**:

- Üretim (maliyet muhasebesi)
- İnşaat / yıllara yaygın işler
- İhracat ve ithalat
- Teknokent / Ar-Ge istisnaları
- Çok şubeli yapı
- Dövizli işlemler (temel modül kapsamında)

Bu alanlar yol haritasına (ROADMAP) bırakılmıştır ve Beta içeriklerinde kullanılmaz.

---

# 9. Geleceğe Açıklık

Atlas Market yalnızca **Beta'nın referans işletmesidir**.

İlerleyen sürümlerde farklı öğrenme ihtiyaçları için yeni referans işletmeler tanımlanacaktır:

- Hizmet işletmesi
- Üretim işletmesi
- İhracat odaklı işletme
- Teknokent / Ar-Ge işletmesi
- Finans

Her yeni referans işletme kendi CUR belgesiyle tanımlanır ve ilgili modülün evreni olur. Atlas Market bu genişlemede ticari işletme modülünün referansı olarak kalır.
