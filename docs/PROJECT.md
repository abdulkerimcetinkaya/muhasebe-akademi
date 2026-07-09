# Muhasebe Akademisi V2 — PROJECT

> Son Güncelleme: 10.07.2026

---

# Proje Amacı

Muhasebe Akademisi, muhasebeyi ezberle değil, gerçek işletme süreçlerini deneyimleyerek öğreten interaktif bir eğitim platformudur.

Hedefimiz yalnızca soru çözdüren bir sistem geliştirmek değildir. Kullanıcının muhasebe mantığını kazanmasını, belgeleri yorumlayabilmesini ve gerçek hayattaki muhasebe işlemlerini doğru şekilde kayıt altına alabilmesini sağlamaktır.

---

# Ürün Vizyonu

**"Bir işletmeyi yönet, muhasebeyi doğal olarak öğren."**

Muhasebe Akademisi'nin temel yaklaşımı budur.

Kullanıcı;

* hesap kodlarını ezberlemez,
* gerçek belgelerle çalışır,
* muhasebe olaylarını analiz eder,
* yevmiye kayıtlarını oluşturur,
* hatalarından öğrenir,
* mevzuat bağlantılarıyla bilgisini pekiştirir.

---

# Roller

## Product Owner

Abdulkerim Çetinkaya

Sorumlulukları:

* Ürün vizyonu
* Önceliklendirme
* Son karar mercii

---

## Chief Architect / Technical Lead

ChatGPT

Sorumlulukları:

* Teknik mimari
* Ürün mimarisi
* Curriculum tasarımı
* TASK planlama
* Code Review
* Claude Code görevlerini hazırlama

---

## Senior Software Engineer

Claude Code

Sorumlulukları:

* Verilen TASK'ları uygulamak
* Mimariye sadık kalmak
* Kapsam dışına çıkmamak

---

# Mevcut Teknik Durum

Tamamlanan çalışmalar:

* M1–M9 teknik altyapı
* Learning Engine
* Yeni içerik mimarisi
* KUR-001
* Frontend Dual Read
* ilerleme_kaydet RPC entegrasyonu

M10 yalnızca mimari analiz olarak tamamlanmış ve Beta sonrasına ertelenmiştir.

---

# Yeni Geliştirme Fazı

Artık öncelik teknik altyapı değil, ürün ve içerik geliştirmedir.

Odak alanları:

* Curriculum
* Öğrenme deneyimi
* İçerik üretimi
* Dashboard
* XP
* Rozetler
* Hikâye tabanlı öğrenme

---

# Geliştirme Kuralları

* Tüm işler TASK sistemiyle yürütülür.
* Claude Code yalnızca verilen TASK kapsamında çalışır.
* Kapsam dışındaki dosyalara dokunulmaz.
* Büyük teknik kararlar ADR ile kayıt altına alınır.
* Eğitim ve içerik kararları CUR belgelerinde yönetilir.
* Beta'yı doğrudan geliştirmeyen teknik işler ertelenebilir.

---

# Öğrenme Modeli

Platformdaki her içerik aşağıdaki sırayı takip eder:

Senaryo

↓

Belge

↓

Muhasebe Olayı

↓

Yevmiye Kaydı

↓

Kontrol

↓

Açıklama

↓

Mevzuat

↓

XP

↓

Yeni Senaryo

---

# İçerik Hiyerarşisi

Program

↓

Modül

↓

Bölüm

↓

Senaryo

↓

Muhasebe Olayı (KUR)

↓

Soru

---

# İlk Beta Modülü

**Ticari İşletme**

İlk Beta sürümünde kullanıcı bir ticari işletmenin temel muhasebe süreçlerini baştan sona deneyimler.

---

# Başarı Kriteri

Yeni bir özellik geliştirirken iki soru sorulur:

1. Bu özellik kullanıcının daha iyi muhasebeci olmasını sağlıyor mu?
2. Bu özellik kullanıcıya gerçek bir işletmeyi yönetiyormuş hissi veriyor mu?

İki sorudan en az birine güçlü bir "Evet" cevabı veremeyen geliştirmeler Beta kapsamında öncelikli değildir.

---

# Son Not

Bu belge yaşayan bir dokümandır.

Proje geliştikçe güncellenebilir.

Ancak ürünün temel vizyonu korunur:

**Muhasebe Akademisi, soru çözdüren bir platform değil; gerçek işletme deneyimiyle muhasebe öğreten bir öğrenme sistemidir.**
