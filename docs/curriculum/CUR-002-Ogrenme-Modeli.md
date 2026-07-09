# CUR-002 — Öğrenme Modeli

**Durum:** Taslak v0.3

---

# Öğrenme Felsefesi

Muhasebe Akademisi, kullanıcıya doğru cevabı doğrudan vermez.

Kullanıcının doğru sonuca kendi muhakemesiyle ulaşmasını sağlar.

---

# Standart Öğrenme Akışı

Her muhasebe olayı aşağıdaki sırayla ilerler.

1. İşletme Olayı
2. Gerçek Belge
3. Belgeyi İncele
4. Mevzuatı Keşfet
5. Muhasebe Kaydı
6. Finansal Etki
7. Mesleki Not
8. Bugün Ne Öğrendin?
9. Yetkinlik Kazanımı
10. Yeni Görev

Bu akış bir döngüdür: her olay, kullanıcıyı bir sonraki göreve hazır hâle getirerek tamamlanır.

---

# Gerçek Belge Yaklaşımı

Platformda eğitim amaçlı sadeleştirilmiş veya sahte belgeler kullanılmaz. Mümkün olduğunca gerçek GİB formatları esas alınır.

Kullanıcı istediğinde **"Belgeyi İncele"** modunu açabilir. Bu modda belge üzerindeki alanlar etkileşimli hâle gelir.

Her belge alanı için;

* muhasebe açıklaması,
* mevzuat açıklaması,
* mesleki açıklama

sunulur.

Böylece kullanıcı belgeyi yalnızca görmez; alan alan ne anlama geldiğini kavrar.

---

# Mentor Modeli

Mentor;

* kullanıcıya adıyla hitap edebilir,
* güven veren bir dil kullanır,
* doğrudan doğru cevabı söylemez,
* düşündürür,
* soru sorar,
* ipucu verir,
* yanlış düşünceyi düzeltir.

Mentorun amacı cevap vermek değil, kullanıcıyı geliştirmektir.

---

# Yardım Sistemi

Kullanıcı;

* sınırsız kez deneyebilir,
* istediği zaman ipucu alabilir,
* istediği zaman çözümü açabilir.

Deneme sınırı yoktur. Çözümü açmak öğrenmeyi engellemez; yalnızca ustalık XP'sini etkileyebilir.

---

# XP Modeli

Platform iki katmanlı bir ilerleme modeli kullanır.

## Öğrenme XP

Olay tamamlandığında kazanılır. Kullanıcı yardım alsa da öğrenme XP'sini kazanır.

## Ustalık XP

Bağımsız problem çözme becerisini ödüllendirir. Çözümün açılması veya yoğun yardım kullanımı ustalık XP'sini azaltabilir; ancak öğrenme XP'sini tamamen ortadan kaldırmaz.

---

# Yetkinlik Modeli

Platformun temel başarı ölçütü XP değildir; asıl amaç mesleki yetkinlik kazandırmaktır.

Her olay sonunda kullanıcı;

* hangi becerileri kazandığını,
* hangi alanlarda geliştiğini,
* bir sonraki hedefini

görebilir.

---

# Learning Engine

Platform zamanla kullanıcıyı tanır ve öğrenme yolunu kişiselleştirir.

Kullanıcı bazında analiz edilebilecek alanlar:

* en çok zorlanılan hesaplar,
* en çok zorlanılan belge türleri,
* en çok yardım alınan mevzuatlar,
* güçlü yönler,
* zayıf yönler,
* yardım kullanım alışkanlığı,
* çözüm inceleme alışkanlığı,
* tekrar gerektiren konular.

Bu veriler, kullanıcıya özel öğrenme yolunu dinamik olarak şekillendirmek için kullanılır.

---

# Temel Tasarım İlkesi

Muhasebe Akademisi;

**doğru cevap öğreten değil, doğru düşünmeyi öğreten bir öğrenme platformudur.**
