// Modül 1, Alt Başlık 1.1 "İşletme ve Şirket Türleri — Genel Bakış"
// kavramsal yeniden yazımının BlockNote içeriğini üretir.

let _idCounter = 0;
const blockId = () => `c${(++_idCounter).toString(36).padStart(7, '0')}`;

const text = (str, styles = {}) => ({ type: 'text', text: str, styles });
const b = (str) => text(str, { bold: true });

const heading = (level, str) => ({
  id: blockId(),
  type: 'heading',
  props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left', level },
  content: [text(str)],
  children: [],
});

const para = (...parts) => ({
  id: blockId(),
  type: 'paragraph',
  props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
  content: parts.map((p) => (typeof p === 'string' ? text(p) : p)),
  children: [],
});

const icerik = [
  heading(2, 'Üç Türü Ayıran Asıl Şey'),
  para(
    'Genel Bakış’ta üç işletme türünü tanıdın: şahıs işletmesi, limited şirket ve anonim şirket. Peki bunları birbirinden gerçekten ayıran ne? Birkaç temel kavram var; bunları anlarsan, neden farklı kaydedildiklerini de anlarsın.',
  ),

  heading(2, 'Tüzel Kişilik'),
  para(
    'Hukukta iki tür “kişi” vardır. Biri ',
    b('gerçek kişi'),
    ', yani sen ben gibi bir insan. Diğeri ',
    b('tüzel kişi'),
    ', yani hukukun “kişi” olarak kabul ettiği şirketler, dernekler, vakıflar. Tüzel kişiliği olan bir şirket, sahibinden ayrı, kendi başına bir varlıktır: kendi adına mal alır, borçlanır, dava açar.',
  ),
  para(
    b('Şahıs işletmesinde tüzel kişilik yoktur.'),
    ' İşletme ile sahibi aynı kişidir. Ahmet’in bakkalı battığında borç Ahmet’in borcudur; işletmenin parası da Ahmet’in parasıdır. İkisi hukuken ayrılmaz.',
  ),
  para(
    b('Limited ve anonim şirkette tüzel kişilik vardır.'),
    ' Demirkol Tekstil, Mehmet ve Selçuk’tan ayrı bir varlıktır. Şirketin parası ortakların cebindeki para değildir; şirketin borcu da doğrudan ortakların borcu sayılmaz. Bu ayrım, muhasebede neden ortakların sermayesini ayrı izlediğimizi açıklar.',
  ),

  heading(2, 'Sorumluluk: Batarsa Ne Olur?'),
  para('İkinci ayıran kavram, işler kötü gittiğinde kimin nereye kadar sorumlu olduğudur.'),
  para(
    b('Şahıs işletmesinde sorumluluk sınırsızdır.'),
    ' İşletme borcunu ödeyemezse, sahibinin kişisel malları (evi, arabası, birikimi) bu borç için gidebilir. Çünkü işletme ile sahibi aynı kişidir.',
  ),
  para(
    b('Limited ve anonim şirkette sorumluluk sınırlıdır.'),
    ' Ortak yalnızca şirkete koymayı söz verdiği ',
    b('sermaye'),
    ' kadar sorumludur. Şirket batsa bile, ortağın kişisel evine arabasına dokunulmaz. İnsanların şirket kurarken limited ya da anonimi seçmesinin en büyük sebebi budur: kişisel mal varlığını korumak.',
  ),

  heading(2, 'İki Tür Defter Tutma Yöntemi'),
  para('İşletmeler defterlerini iki şekilde tutabilir.'),
  para(
    'Biri ',
    b('işletme hesabı'),
    ' denen basit yöntemdir. Burada sadece “ne girdi, ne çıktı” yazılır; gelir bir tarafa, gider öbür tarafa. Küçük işletmeler için pratiktir ama işletmenin neye sahip olduğunu, kime ne kadar borçlu olduğunu tek bakışta göstermez.',
  ),
  para(
    'Diğeri ',
    b('bilanço esası'),
    ' denen daha kapsamlı yöntemdir. Burada işletmenin parası, malı, alacağı, borcu, demirbaşı, kısacası sahip olduğu ve borçlu olduğu her şey kaydedilir. Bu yöntemle her dönem sonunda bir ',
    b('bilanço'),
    ' çıkarılır; bilançoya bakan biri işletmenin durumunu görür: neyi var, neyi borç, sonuçta zengin mi fakir mi.',
  ),
  para(
    'Şahıs işletmeleri normalde işletme hesabı tutabilir, ama isterlerse bilanço esasını da seçebilir. Tüzel kişiliği olan şirketler (limited, anonim) ise zorunlu olarak bilanço esası tutar; çünkü şirketin malı, borcu, parası, her şeyi bilançoda görünmek zorundadır.',
  ),
  para(
    b('Bu uygulamada hepimiz bilanço esasıyla çalışacağız.'),
    ' Hem gerçek meslek hayatında en çok kullanılan yöntem budur, hem de bilançoyu öğrenmek, bir işletmeyi gerçekten “okumayı” öğrenmek demektir.',
  ),

  heading(2, 'Bu Neden Muhasebeyi Değiştirir?'),
  para('Bütün bu kavramlar sadece hukuki değil; doğrudan tutacağın deftere yansır.'),
  para(
    'Şahıs işletmesinde sahibi parayı koyar, sen de doğrudan onun sermayesi olarak yazarsın. Ortak yoktur, “kim ne kadar koydu” diye ayrı ayrı izlemen gerekmez. Şirketlerde ise her ortağın koyduğu, söz verdiği, henüz ödemediği sermaye ',
    b('ayrı ayrı'),
    ' izlenir. Çünkü şirket ayrı bir varlıktır ve ortakların ona olan borcu tek tek takip edilmelidir. İlerleyen başlıklarda bu farkı kayıtların içinde somut olarak göreceksin.',
  ),
];

const sqlString = (obj) => "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";

console.log(
  `update modul_alt_basliklari set icerik = ${sqlString(icerik)}, icerik_guncellendi = now(), updated_at = now() where id = 'mal-alis-satis-1-1';`,
);
