// Modül 1, Alt Başlık 1.3 için 10 yeni soru — Ahmet Yıldız / Yıldız Bakkaliye karakteriyle
// Eski Hasan Usta / Doğru Yol Mobilya sorularını kaldırıp yenisini koyar.

const M = (kod, ad) => ({ kod, ad });

const SORULAR = [
  {
    id: 's13-01',
    baslik: 'Ticari Malın Ayni Sermaye Olarak Eklenmesi',
    zorluk: 'kolay',
    senaryo:
      '05.01.2025, Karabük. Ahmet Yıldız, "Ahmet Yıldız Bakkal" unvanıyla işletmesini kuruyor ve raflara dizilmek üzere 90.000 TL değerinde ticari malı sermaye olarak işletmeye koyuyor. Bu işleme ait yevmiye kaydını yapınız.',
    ipucu:
      'Ticari mal 153 hesabına yazılır. Karşısında sahibinin adıyla 500 Sermaye alacaklanır.',
    aciklama:
      'Şahıs işletmesinde ayni sermaye konulduğunda, varlığın türüne göre ilgili aktif hesap borçlanır, karşısında sahibinin sermaye hesabı (500) alacaklanır. 153 Ticari Mallar 90.000 borç, 500.001 Ahmet Yıldız 90.000 alacak.',
    etiketler: ['ayni-sermaye', 'ticari-mal', '153', '500'],
    muavinler: [
      M('153.001', 'Ticari Mallar'),
      M('255.001', 'Demirbaşlar'),
      M('254.001', 'Taşıtlar'),
      M('500.001', 'Ahmet Yıldız'),
      M('100.001', 'Merkez Kasa'),
    ],
    cozum: [
      { kod: '153.001', borc: 90000, alacak: 0 },
      { kod: '500.001', borc: 0, alacak: 90000 },
    ],
  },
  {
    id: 's13-02',
    baslik: 'Demirbaşın Ayni Sermaye Olarak Eklenmesi',
    zorluk: 'kolay',
    senaryo:
      '08.01.2025, Karabük. Ahmet Yıldız Bakkal\'ı kuran Ahmet Yıldız, işletmeye 45.000 TL değerinde bir buzdolabı ve raf sistemini demirbaş olarak koyuyor. Bu işleme ait yevmiye kaydını yapınız.',
    ipucu:
      'Buzdolabı ve raf satılık ürün değil, işletmede kullanılacak → 255 Demirbaşlar.',
    aciklama:
      'Satılık ürün olmayan, işletmenin faaliyetinde kullanılan varlıklar 255 Demirbaşlar hesabına yazılır. 255.001 Demirbaşlar 45.000 borç, 500.001 Ahmet Yıldız 45.000 alacak.',
    etiketler: ['ayni-sermaye', 'demirbas', '255', '500'],
    muavinler: [
      M('255.001', 'Demirbaşlar'),
      M('153.001', 'Ticari Mallar'),
      M('254.001', 'Taşıtlar'),
      M('500.001', 'Ahmet Yıldız'),
      M('100.001', 'Merkez Kasa'),
    ],
    cozum: [
      { kod: '255.001', borc: 45000, alacak: 0 },
      { kod: '500.001', borc: 0, alacak: 45000 },
    ],
  },
  {
    id: 's13-03',
    baslik: 'Taşıtın Ayni Sermaye Olarak Eklenmesi',
    zorluk: 'kolay',
    senaryo:
      '10.01.2025, Karabük. Ahmet Yıldız, işletmesine dağıtım işlerinde kullanmak üzere 220.000 TL değerindeki kamyonetini sermaye olarak koyuyor. Bu işleme ait yevmiye kaydını yapınız.',
    ipucu:
      'Kamyonet işletme faaliyetinde kullanılacak bir taşıt → 254 Taşıtlar.',
    aciklama:
      'İşletme faaliyetinde kullanılacak araçlar 254 Taşıtlar hesabına yazılır. 254.001 Taşıtlar 220.000 borç, 500.001 Ahmet Yıldız 220.000 alacak.',
    etiketler: ['ayni-sermaye', 'tasit', '254', '500'],
    muavinler: [
      M('254.001', 'Taşıtlar'),
      M('255.001', 'Demirbaşlar'),
      M('153.001', 'Ticari Mallar'),
      M('500.001', 'Ahmet Yıldız'),
      M('102.001', 'İş Bankası'),
    ],
    cozum: [
      { kod: '254.001', borc: 220000, alacak: 0 },
      { kod: '500.001', borc: 0, alacak: 220000 },
    ],
  },
  {
    id: 's13-04',
    baslik: 'Ticari Mal ve Demirbaş ile Ayni Sermaye',
    zorluk: 'kolay',
    senaryo:
      '12.01.2025, Karabük. Ahmet Yıldız, işletmesine 70.000 TL değerinde ticari mal ile 30.000 TL değerinde tartı ve reyon dolabını sermaye olarak koyuyor. Bu işleme ait yevmiye kaydını yapınız.',
    ipucu:
      'İki varlık iki ayrı borç satırı, karşısında tek sermaye toplamı.',
    aciklama:
      'Birden fazla varlık konulduğunda her biri ayrı borç satırına yazılır, toplamları tek bir 500 Sermaye alacak satırında birleşir. 153 + 255 toplamı = 100.000.',
    etiketler: ['ayni-sermaye', 'ticari-mal', 'demirbas', '153', '255', '500'],
    muavinler: [
      M('153.001', 'Ticari Mallar'),
      M('255.001', 'Demirbaşlar'),
      M('254.001', 'Taşıtlar'),
      M('500.001', 'Ahmet Yıldız'),
      M('100.001', 'Merkez Kasa'),
    ],
    cozum: [
      { kod: '153.001', borc: 70000, alacak: 0 },
      { kod: '255.001', borc: 30000, alacak: 0 },
      { kod: '500.001', borc: 0, alacak: 100000 },
    ],
  },
  {
    id: 's13-05',
    baslik: 'Nakit ve Ayni Sermayenin Birlikte Eklenmesi',
    zorluk: 'kolay',
    senaryo:
      '15.01.2025, Karabük. Ahmet Yıldız, işletmesine 50.000 TL nakit parayı kasaya, 120.000 TL değerinde ticari malı da rafa koyarak sermaye olarak getiriyor. Bu işleme ait yevmiye kaydını yapınız.',
    ipucu: 'Nakit kasaya, mal 153 hesabına. Karşıda tek 500 Sermaye satırı.',
    aciklama:
      'Karma sermaye: 100 Kasa ve 153 Ticari Mallar borçlanır, toplamları tek 500 Sermaye alacak satırına yazılır. 50.000 + 120.000 = 170.000.',
    etiketler: ['ayni-sermaye', 'nakit', 'karma', '100', '153', '500'],
    muavinler: [
      M('100.001', 'Merkez Kasa'),
      M('153.001', 'Ticari Mallar'),
      M('255.001', 'Demirbaşlar'),
      M('254.001', 'Taşıtlar'),
      M('500.001', 'Ahmet Yıldız'),
    ],
    cozum: [
      { kod: '100.001', borc: 50000, alacak: 0 },
      { kod: '153.001', borc: 120000, alacak: 0 },
      { kod: '500.001', borc: 0, alacak: 170000 },
    ],
  },
  {
    id: 's13-06',
    baslik: 'Üç Varlığın Ayni Sermaye Olarak Eklenmesi',
    zorluk: 'orta',
    senaryo:
      '18.01.2025, Karabük. Ahmet Yıldız, işletmesini kurarken üç ayrı varlığı sermaye olarak koyuyor: 80.000 TL değerinde ticari mal, 40.000 TL değerinde soğutucu ve dolaplar, bir de 200.000 TL değerinde kamyonet. Varlıkların değerleri yetkili değerleme ile belirlenmiştir. Bu işleme ait yevmiye kaydını yapınız.',
    ipucu:
      'Üç varlık üç ayrı borç satırı. Sermaye tek satırda toplanır (sahibe ait).',
    aciklama:
      'Üç varlık üç ayrı borç satırına yazılır ama hepsi aynı sahibe ait olduğu için karşılarında tek bir 500.001 Ahmet Yıldız satırı bulunur. Toplam: 80.000 + 40.000 + 200.000 = 320.000.',
    etiketler: ['ayni-sermaye', 'uc-varlik', '153', '254', '255', '500'],
    muavinler: [
      M('153.001', 'Ticari Mallar'),
      M('255.001', 'Demirbaşlar'),
      M('254.001', 'Taşıtlar'),
      M('500.001', 'Ahmet Yıldız'),
      M('100.001', 'Merkez Kasa'),
    ],
    cozum: [
      { kod: '153.001', borc: 80000, alacak: 0 },
      { kod: '255.001', borc: 40000, alacak: 0 },
      { kod: '254.001', borc: 200000, alacak: 0 },
      { kod: '500.001', borc: 0, alacak: 320000 },
    ],
  },
  {
    id: 's13-07',
    baslik: 'Ayni Sermayede Yetkili Değerleme Bağlayıcılığı',
    zorluk: 'orta',
    senaryo:
      '20.01.2025, Karabük. Ahmet Yıldız, işletmesine bir minibüsü sermaye olarak koymak istiyor. Minibüsü kendisi 350.000 TL değerinde olduğunu düşünüyor; ancak yetkili değerleme sonucunda minibüsün değeri 290.000 TL olarak belirleniyor. Bu işleme ait yevmiye kaydını yapınız.',
    ipucu:
      'Ayni sermaye sahibinin sözüyle değil, yetkili değerleme ile kayda alınır.',
    aciklama:
      'Ayni sermayenin değeri sahibinin tahminiyle değil, yetkili değerleme raporuyla belirlenir. Sahibinin 350.000 TL beklentisi değil, raporun belirlediği 290.000 TL kayda alınır.',
    etiketler: ['ayni-sermaye', 'degerleme-tuzagi', '254', '500'],
    muavinler: [
      M('254.001', 'Taşıtlar'),
      M('255.001', 'Demirbaşlar'),
      M('153.001', 'Ticari Mallar'),
      M('500.001', 'Ahmet Yıldız'),
      M('100.001', 'Merkez Kasa'),
    ],
    cozum: [
      { kod: '254.001', borc: 290000, alacak: 0 },
      { kod: '500.001', borc: 0, alacak: 290000 },
    ],
  },
  {
    id: 's13-08',
    baslik: 'Sermayeden Eş Katkısının Ayrılması',
    zorluk: 'orta',
    senaryo:
      '22.01.2025, Karabük. Ahmet Yıldız, işletmesine 95.000 TL değerinde ticari mal ve 35.000 TL değerinde demirbaş koyuyor. Aynı gün eşi Ayşe Hanım da işletmeye destek olmak için kasaya 40.000 TL bırakıyor; ancak bu para Ahmet\'in sermayesine dahil değildir, sadece geçici bir aile desteğidir ve ayrı değerlendirilecektir. Sadece Ahmet Yıldız\'ın ayni sermaye kaydını yapınız.',
    ipucu: 'Eş katkısı bu kayıt dışıdır; sadece Ahmet\'in koyduklarını yaz.',
    aciklama:
      'Senaryoda Ayşe Hanım\'ın 40.000 TL\'lik katkısı bilgi olarak verilmiştir ama sahibinin sermayesi değildir ve ayrı değerlendirilecektir. Sadece Ahmet\'in koyduğu varlıklar kayda girer: 95.000 + 35.000 = 130.000.',
    etiketler: ['ayni-sermaye', 'bilgi-eleme', '153', '255', '500'],
    muavinler: [
      M('153.001', 'Ticari Mallar'),
      M('255.001', 'Demirbaşlar'),
      M('254.001', 'Taşıtlar'),
      M('500.001', 'Ahmet Yıldız'),
      M('100.001', 'Merkez Kasa'),
    ],
    cozum: [
      { kod: '153.001', borc: 95000, alacak: 0 },
      { kod: '255.001', borc: 35000, alacak: 0 },
      { kod: '500.001', borc: 0, alacak: 130000 },
    ],
  },
  {
    id: 's13-09',
    baslik: 'Çok Kalemli Ayni Sermayede Değerleme',
    zorluk: 'zor',
    senaryo:
      '25.01.2025, Karabük. Ahmet Yıldız, işletmesine üç varlık koyuyor: 110.000 TL değerinde ticari mal, 60.000 TL değerinde soğutucu dolaplar ve bir kamyonet. Kamyonet için sahibi 300.000 TL beklerken yetkili değerleme aracın değerini 250.000 TL olarak belirliyor. Bu işleme ait yevmiye kaydını yapınız.',
    ipucu:
      'Taşıt için yetkili değerleme bağlayıcı. Üç varlık ayrı satır, sermaye tek satır.',
    aciklama:
      'İki kavram aynı anda çalışır: (1) ayni sermaye yetkili değerleme ile kayda alınır → kamyonet 250.000 TL (sahibinin 300.000 beklentisi değil); (2) üç varlık üç ayrı borç satırı, tek sermaye toplamı. Doğru toplam: 110.000 + 60.000 + 250.000 = 420.000.',
    etiketler: ['ayni-sermaye', 'degerleme-tuzagi', 'uc-varlik', '153', '254', '255', '500'],
    muavinler: [
      M('153.001', 'Ticari Mallar'),
      M('255.001', 'Demirbaşlar'),
      M('254.001', 'Taşıtlar'),
      M('500.001', 'Ahmet Yıldız'),
      M('100.001', 'Merkez Kasa'),
    ],
    cozum: [
      { kod: '153.001', borc: 110000, alacak: 0 },
      { kod: '255.001', borc: 60000, alacak: 0 },
      { kod: '254.001', borc: 250000, alacak: 0 },
      { kod: '500.001', borc: 0, alacak: 420000 },
    ],
  },
  {
    id: 's13-10',
    baslik: 'Ödünç Alınan Varlığın Sermaye Dışında Tutulması',
    zorluk: 'zor',
    senaryo:
      '28.01.2025, Karabük. Ahmet Yıldız, işletmesine 60.000 TL nakit, 130.000 TL değerinde ticari mal ve 210.000 TL değerindeki kamyonetini sermaye olarak koyuyor. Aynı gün komşusu, kullanmadığı bir buzdolabını işletmede kullanması için ödünç veriyor; bu buzdolabı işletmeye ait değildir ve sahibine geri verilecektir. Sadece Ahmet Yıldız\'ın sermaye kaydını yapınız.',
    ipucu:
      'Ödünç alınan varlık işletmeye ait değil, kayda girmez. Sadece sahibin koyduğu nakit ve ayni varlıklar.',
    aciklama:
      'İki tuzak vardır: (1) komşunun ödünç verdiği buzdolabı işletmenin mülkiyetine geçmediği için 255 Demirbaşlar\'a yazılmaz; (2) nakit + ayni varlıklar üç ayrı borç satırı, tek sermaye toplamı. Doğru toplam: 60.000 + 130.000 + 210.000 = 400.000.',
    etiketler: ['ayni-sermaye', 'nakit', 'bilgi-eleme', 'karma', '100', '153', '254', '500'],
    muavinler: [
      M('100.001', 'Merkez Kasa'),
      M('153.001', 'Ticari Mallar'),
      M('254.001', 'Taşıtlar'),
      M('255.001', 'Demirbaşlar'),
      M('500.001', 'Ahmet Yıldız'),
    ],
    cozum: [
      { kod: '100.001', borc: 60000, alacak: 0 },
      { kod: '153.001', borc: 130000, alacak: 0 },
      { kod: '254.001', borc: 210000, alacak: 0 },
      { kod: '500.001', borc: 0, alacak: 400000 },
    ],
  },
];

const esc = (s) => String(s).replace(/'/g, "''");

console.log('begin;');
console.log('-- 1.3 (s13-*) için eski çözümleri sil');
console.log("delete from cozumler where soru_id like 's13-%';");
console.log();

for (const s of SORULAR) {
  console.log(`-- ${s.id} ${s.baslik}`);
  console.log(`update sorular set`);
  console.log(`  baslik = '${esc(s.baslik)}',`);
  console.log(`  zorluk = '${s.zorluk}',`);
  console.log(`  senaryo = '${esc(s.senaryo)}',`);
  console.log(`  ipucu = '${esc(s.ipucu)}',`);
  console.log(`  aciklama = '${esc(s.aciklama)}',`);
  console.log(`  muavinler = '${esc(JSON.stringify(s.muavinler))}'::jsonb,`);
  console.log(`  etiketler = ARRAY[${s.etiketler.map((e) => `'${esc(e)}'`).join(', ')}]::text[],`);
  console.log(`  updated_at = now()`);
  console.log(`where id = '${s.id}';`);
  console.log();
  for (let i = 0; i < s.cozum.length; i++) {
    const c = s.cozum[i];
    console.log(
      `insert into cozumler (soru_id, kod, borc, alacak, sira) values ('${s.id}', '${c.kod}', ${c.borc}, ${c.alacak}, ${i + 1});`,
    );
  }
  console.log();
}

console.log('commit;');
