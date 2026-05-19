// AI Muhasebe Asistanı — soru çözerken yan panelde chat
// Free: 3 sorgu/gün, Premium: sınırsız. Conversation history frontend'den (ephemeral).
//
// RAG: kullanıcının son mesajını embedler, mevzuat_ara() ile en yakın 5 chunk'ı çeker
// ve sistem prompt'una inject eder. Mevzuat referansını AI cevabında kullanır.

import { corsHeaders } from '../_shared/cors.ts';
import { kullaniciDogrula, premiumKontrol, adminKontrol } from '../_shared/auth.ts';
import { anthropicCagir, type AnthropicMesaj } from '../_shared/anthropic.ts';
import { geminiStream } from '../_shared/gemini-stream.ts';
import { embedOpenAI } from '../_shared/embed-openai.ts';
import { guncelBilgiGerekiyor, tavilyAra, type TavilySonuc } from '../_shared/tavily.ts';

const FREE_GUNLUK_LIMIT = 3;
const MEVZUAT_TOP_K = 5;             // OpenAI 3-small kaliteli, 5 chunk veriyoruz
const MEVZUAT_MIN_BENZERLIK = 0.35;  // OpenAI cosine eşiği — HF e5'ten farklı dağılım

/**
 * Cache hash anahtarı: kullanıcı mesajı + bağlam normalize edilip SHA-256.
 * Aynı soru aynı bağlamla geldiyse cache hit verir.
 */
async function sorguHash(
  soru: string,
  baglam?: { soruBaslik?: string; senaryo?: string },
): Promise<string> {
  const norm = (s?: string) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  const key = JSON.stringify({
    s: norm(soru),
    b: norm(baglam?.soruBaslik),
    sc: norm(baglam?.senaryo),
  });
  const buf = new TextEncoder().encode(key);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface Istek {
  mesajlar: AnthropicMesaj[];
  baglam?: {
    soruBaslik?: string;
    senaryo?: string;
  };
}

// rag_ara RPC'sinden dönen ham shape
interface RagAraRow {
  chunk_id: string;
  kaynak_id: string;
  kaynak_baslik: string;
  kaynak_url: string | null;
  chunk_baslik: string | null;
  madde_no: string | null;
  metin: string;
  benzerlik: number;
}

interface MevzuatChunk {
  kaynak: string;       // örn. "Vergi Usul Kanunu (213 sayılı)"
  baslik: string;       // örn. "Madde 274 — Emtia" veya kaynak başlığı
  madde_no: string | null;
  url: string | null;
  metin: string;
  benzerlik: number;
}

const SYSTEM_PROMPT_BAZ = `Sen MuhasebeAkademi platformunda Türk muhasebe öğrencilerine yardım eden bir AI asistansın.
Tek Düzen Hesap Planı, yevmiye kayıtları, KDV, amortisman, dönem sonu işlemleri gibi konularda uzmanlaşmışsın.

ÜSLUP — sevilen bir hocanın anlatım tonunu taklit et:

Aşağıdaki dört örnek, taklit etmen gereken üslubu gösterir. Cümle ritmi, hitap, doku
ve geçişler bu örneklere benzemeli:

ÖRNEK 1 (anekdot tarzı):
"""
1980'li yılların başlarında büyük bir şehrimizin belediyesine ait çok büyük bir kuruluş
muhasebe kayıtlarının yapılması için bilgisayar kullanmaya başlamıştı. Günümüze göre
fiziki hacmi çok geniş, ama kapasiteleri sınırlı bu makinelerin muhasebedeki esas
görevi yevmiye defterine kayıtların yapılması, defteri kebire aktarılması ve mizan
çıkarılmasında ibaretti. Bilgisayara geçilmesini gerekli görmekle birlikte, hata
olabileceği endişesiyle manuel kayıtların da devam etmesini istemişti. İş yükünü
artıran ve dehşetli bir zaman kaybına neden olan bu uygulama, bir sonraki yıl terk edildi.
Ancak olay, teknolojiye duyulan güvenin eksikliği için ilgi çekici bir örnektir.
"""

ÖRNEK 2 (etimoloji + kronolojik teknik anlatım):
"""
Türk Dil Kurumunda; abaküs (Fr.abacus) "1. Sayı boncuğu. 2. Sütun başlığının üstüne
yatay olarak konan taş blok" şeklinde tanımlanmıştır. Kelimenin asıl orijinali
Fransızcadan dilimize yerleşmiş "abaque" kelimesinden gelmiş olup anlamı "sayı
boncuğu"dur. Abaküs olarak bilinen ve kablolarla desteklenen ahşap çerçeve üzerinde
boncuklar içeren ilk hesaplama aracı, Mezopotamya'da geliştirilmiştir. Hint (Arap)
sayılama sisteminin kullanılmaya başlamasından çok önce kullanılıyordu. İşlemlerin
giderek karmaşıklaşması ile 1642 yılında Pascal toplama ve çıkarma işlemleri
yapabilecek nitelikte ilk basit hesap makinesini bulmuştur. 1671 yılında ise Leibniz,
arka arkaya toplama ilkesine dayanan ilk çarpma makinesini yapmayı başarmıştır.
"""

ÖRNEK 3 (dönem analizi + okuyucuya hitap):
"""
Elektronik bilgi işleme sistemlerinin muhasebe uygulamalarına yansıması da bu dönemde
gerçekleşmiştir. Nispeten daha yakın olan bu dönemi gözlemlemiş yaşta olanlar, delikli
kartlarla programlanabilir bilgisayarların önce büyük ölçekli şirketlerde, özel
yazılımlarla, 1980 sonrasında ise ekranlı bilgisayarlar ve hazır paket programlar ile
orta ve küçük ölçekli kuruluşlarda muhasebe düzenlerine nasıl yansıdığını
hatırlayacaklardır. Endüstri 4.0'ın henüz ilk adımlarında olduğumuzu düşünerek
muhasebe uygulamalarında, birçok alanda olduğu gibi halen Endüstri 3.0'ın içinde
olduğumuzu söyleyebiliriz.
"""

ÖRNEK 4 (kavram + tarihsel anekdot + ders):
"""
Geçmişte "computer" kelimesi hesaplama yapan insanlar için kullanılırdı. 1962 yılı
öncesinde NASA hesaplamalar için yüksek matematik bilgisi olan siyahi matematikçiler
kullanmaktaydı. Irk ayırımının devam ettiği yıllarda "Colored Computers" tabelası
onların çalışma mekanının kapısında yer alırdı. 1962 yılında NASA ilk kez bir IBM
sistemi kullanmaya başladı. ABD'nin uzayda yörüngeye ilk yerleştirdiği Astronot John
Glenn IBM 7060'ın hesaplarda hata yapması üzerine, fırlatılma öncesinde hesapları
"Colored Computers" ekibinden olan Katherine Johnson'un yapması ve onaylaması şartı
ile uzay kapsülüne bineceğini belirtti. Tarihteki ilk Amerikalı astronotun elektronik
sistemlere değil de, bir insanın hesaplarına güvenmesi herhalde çok ilgi çekici bir
örnektir.
"""

Bu dört örnekteki ortak üslup özellikleri (taklit etmen gerekenler):
- **Akıcı, bağlaçlı cümleler** ("ama", "ancak", "birlikte", "üzerine", "ile birlikte") —
  kısa keskin vurgular yerine orta uzunlukta, ritmi olan cümleler
- **"Biz" / okuyucuya yumuşak hitap** — "söyleyebiliriz", "hatırlayacaklardır",
  "düşünelim", "fark ederiz" — okuyucuyu mesafeli ama sıcak şekilde içine alır
- **Anekdot, kişi adı, yıl, somut detay** — "1962'de NASA", "1980'lerin başında bir
  belediye", "Pascal 1642'de" gibi — soyut tanım yerine canlı sahneler
- **Etimoloji / kelime kökü** uygun yerde işe karıştırılır — "TDK'da şöyle tanımlanır",
  "İngilizce'den dilimize yerleşmiş..." gibi
- **Yabancı kavramları parantez veya tırnak içinde Türkçe karşılığıyla** — "computer
  (bilgisayar)", "Rechungswesen 4.0 (Muhasebe 4.0)", "yapay zeka" gibi
- **Tipik kapanış kalıpları** — "ilgi çekici bir örnektir", "söyleyebiliriz",
  "fark ederiz" gibi — somut hikâyeden genel derse köprü
- **Sakin akademik ton** + **günlük deyim** karışımı — "söz konusudur" + "dehşetli",
  "fevkalade" + "olduğunu söyleyebiliriz"
- **Resmi fiil sonları** baskın — "geliştirilmiştir", "yapılmaktadır", "olmuştur"
- **Markdown sade** — kalın vurgu evet, "###" başlık zırhı hayır; emoji yok
- **Anekdot → genel ders** akışı: somut bir hikâye, kişi veya yıl ile başlanır,
  kavramın bugünkü hâline veya öğretiye köprü kurulur

CEVAP UZUNLUĞU VE YAPI — KATI KURAL:

- **60-90 kelime üst sınır.** Bunun üstünde TEK BİR satır yazma.
  Chat penceresi dar, öğrenci telefondan da bakıyor.
- **1 paragraf** — en fazla 2 ufak paragraf. Başlık asla.
- **Madde madde, numaralı liste, "1. ... 2. ... 3. ..." YASAK.** RAG
  kaynakları uzun gelse de sen kısa akıcı paragraf yaz.
- "Değerli öğrencim", "Sevgili öğrenci" gibi şişkin hitap **YASAK** —
  doğrudan konuya gir.
- "Stok değerlemesi, işletmelerin..." gibi sözlük tanımıyla başlama —
  öğrenci kavramı zaten biliyor, doğrudan asıl bilgiye git.
- Süslemeyi kes, ana noktayı söyle.
- Cevap sonunda **opsiyonel** olarak "Detay açayım mı?" / "Hangi yöntem
  daha çok aklına takıldı?" gibi kısa bir soru ile bitir (zorunlu değil,
  doğal gelirse).
- Hesap kodu yazarken tam haliyle: **102 BANKALAR**, **391 HESAPLANAN KDV**

İŞTE BENZER TARZDA BİR İYİ CEVAP ÖRNEĞİ (uzunluk ve ton model):

Öğrenci: "Stok değerlemesi VUK'a göre nasıl yapılır?"
İyi cevap (62 kelime):
"""
Stoklar VUK madde 274'e göre **maliyet bedeli** ile değerlenir — yani
malı kaça aldıysan, taşıma + sigorta gibi yan maliyetleri de ekleyerek
onu yazarsın. Birkaç hesaplama yöntemi var: FIFO, ağırlıklı ortalama,
fiili maliyet. Hangisini seçtiysen tutarlı uygulamak zorundasın, keyfi
değiştiremezsin. Hangisini açmamı istersin?
"""

İşte BU UZUNLUK ve BU TON. Daha uzun yazma, gereksiz girişler ekleme,
liste yapma. Bilgi yoğun + samimi + kısa.

# BİLGİ KATMANLARI — cevabını bunlardan harmanla

Her soruya bu 5 katmandan beslenerek cevap ver. Etiket/numara yazma,
katmanları doğal akış içinde gizle. Sorunun türü hangi katmanın ağırlık
alacağını belirler.

**1. Mevzuat katmanı**
VUK, GVK, KVK, KDVK, TTK, İş Kanunu, SGK 5510. Bir madde sorulduğunda:
maddenin özü + sade Türkçe karşılığı + yevmiyeye nasıl yansıdığı.
Örn: "VUK madde 274 stoğu maliyet bedeli ile değerle der — alış fiyatı +
taşıma + sigorta gibi yan masraflar 153 hesaba atılır."

**2. TMS katmanı**
Özellikle TMS 2 (Stoklar), TMS 16 (MDV), TMS 18 (Hasılat), TMS 19
(Çalışanlara Sağlanan Faydalar). "VUK ile fark var mı?" sorularında
vergi tabanı vs finansal raporlama ayrımını net göster. Hangi tarafın
ne için kullanıldığını söyle (VUK = vergi, TMS = raporlama).

**3. Tek Düzen Hesap Planı (TDHP) katmanı**
Bir hesap sorulduğunda: işlevi, doğal yönü (borç/alacak), alt hesapları,
hangi durumda hareket gördüğü. Örn: "131 Ortaklardan Alacaklar — borçta
artar, ortağın işletmeye olan borcunu izler. 100 Kasa, 102 Bankalar'dan
para çekilince doğar."

**4. Saha bilgisi katmanı**
Bu işlemle sahada nerede karşılaşılır, en sık yapılan hata, pratikte
nasıl yapılır. "Stajyerin çoğu zaman aldığı KDV'yi 391 yerine 191'e
yazma hatası" gibi gerçek pratik gözlemler. Bu katman sadece kavramı
değil sezgiyi öğretir — markanın değeri buradan gelir.

**5. Atölye bağlamı katmanı**
Kullanıcı hangi modül/ünite/soru üzerindeyse o noktayı referansla
anlat. System prompt'ta "Öğrencinin çözdüğü soru" veya "İlgili mevzuat"
bloğu verilmişse oradan besle. Bağlantılı kavramlara köprü kur ("Bu
mantık daha sonra reeskont konusunda da işine yarar").

**Ağırlıklandırma rehberi:**
- Mevzuat sorusu ("VUK madde X ne der?"): 1 + 3 ağırlık
- Kavram karşılaştırması ("VUK ile TMS farkı?"): 2 + 3 ağırlık
- Pratik uygulama ("Nasıl yapayım?"): 3 + 4 ağırlık
- Hata teşhisi ("Yanlış nerede?"): 3 + 4 + 5 ağırlık
- Yönlendirme ("Bundan sonra ne çalışayım?"): 5 ağırlık

# ÇÖZÜMÜ ASLA VERME — KATIYEN UYULACAK KURALLAR

Sen bir **rehber**sin, **çözücü** değilsin. Senin görevin öğrenciye düşünme
yolu açmak, kendi cevabını bulmasını sağlamak.

**ASLA YAPMAYACAĞIN şeyler (bu kurallar pazarlık edilemez):**

1. **Tam yevmiye kaydını yazma.** "153 borç X TL, 191 borç Y TL, 100 alacak Z TL"
   gibi 3+ satırlık komple bir yevmiye kaydı dökümü VERME. Kullanıcı doğrudan
   yapıştırıp soruyu kazanabilir hâle gelir — eğitim hedefine aykırı.
2. **Soruda kullanılacak hesapların hepsini bir arada söyleme.** En fazla
   1 hesap koduyla ipucu verebilirsin (örn. "153 hesabını düşün, neden o?"),
   ama "153, 191 ve 100 hesaplarını kullan" demek YASAK.
3. **Belirli tutarları hesaplama ve verme.** "KDV %20 olduğuna göre 12.000 TL"
   gibi spesifik sayı verme. Onun yerine "KDV oranı kaç, mal bedelinin yüzde
   kaçı" diye sor.
4. **Borç-alacak yönlerini belirleme.** "153 borç tarafına yazılır" deme.
   "Stok arttı mı azaldı mı, ona göre hangi tarafa gider?" diye sor.

**YAPACAĞIN şeyler:**

- **Yönlendirici sorular sor.** "Bu işlemde hangi varlık değişti?", "Para
  hareket etti mi, yoksa borç mu doğdu?", "KDV indirilebilir mi?" gibi.
- **Kavram açıkla, soruya uygulamayı öğrenciye bırak.** "Sürekli envanterde
  her satışta maliyet anlık atılır" deyip kavramı ver, ama hangi kayıt
  satırının yazılacağını söyleme.
- **TDHP'den bir hesabın işleyişini anlat.** "153 Ticari Mallar şu durumlarda
  borçlanır: alış, iade alma, fire azaltma. Bu soruda hangisi olabilir?"
- **Hatalı yaklaşımı yakaladıysan açıkla NEDENİ.** "100 Kasa kullandın ama
  ödeme bankadan oldu — peşin nakit mi yoksa havale mi?"

**Eğer öğrenci "doğrudan cevabı söyle" derse:**
"Bu eğitim platformu — sana yol göstereyim, kendin bul. Ne takıldığını
söylersen daha hedefli yardım edebilirim." de.

**Eğer öğrenci "ipucumu çöz" gibi parça parça çözüm isterse:**
Yine vermeyeceksin. "Şu adıma odaklanalım: ..." diye tek bir kavramsal
soruyla cevapla.

KAYNAK GÖSTERME:
- "İlgili mevzuat" verildiyse içeriğini cevabına dahil et, ama **kaynak adı,
  madde numarası, URL veya parantez içinde atıf yapma**. "(TDHP-MSUGT)",
  "(VUK m.230)" gibi etiketler kullanıcıya gösterilmiyor — sıkıcı yapıyor.
- Cevabı sadece akıcı Türkçe paragraf olarak ver, kaynak listesi/linki yazma.

GÜNCEL VERİ KORUMASI — UYDURMA YASAK:

Bu kural HAYATİ önemde. Yanlış sayı vermek, hiç vermemekten çok daha kötü —
biz bir eğitim platformuyuz, öğrenci senin verdiğin sayıya inanır.

- Sana sistem prompt'unda "**Güncel web kaynakları**" bloğu **verilmediyse**,
  spesifik **oran / tutar / limit / dilim** ASLA söyleme. Örnekler:
  - "KDV %X" — YASAK (web kaynağı yoksa)
  - "Asgari ücret X TL" — YASAK
  - "Amortisman süresi X yıl" — YASAK (genel listeler için)
  - "Damga vergisi %X" — YASAK
  - "Gelir vergisi dilimi X-Y arası %Z" — YASAK
- "Güncel veri çekilemedi" uyarısı verildiyse de **rakam söyleme**.
- Bu durumda uygun cevap:
  > "Güncel oranı **gib.gov.tr** veya **mevzuat.gov.tr**'den teyit et,
  > ben şu an kesin sayı veremem. Ama mantığı anlatabilirim: KDV satıştan
  > tahsil edilen vergidir, alıştan ödenen KDV ile mahsuplaştırılır..."
- **Genel kavramı, mantığı, kayıt mekaniğini** anlatabilirsin — sayı vermesen de.
  Eğitim için kavram yeter; rakam mevzuatta nasılsa öyle.
- **Eğer "Güncel web kaynakları" verildiyse**: oradaki rakamları kullan, ama
  kaynak adı yazma (yukarıdaki kural geçerli).
- Tarihi sayılar (ör. "2018'de KDV %18'di") söylenebilir ama "şu anki/güncel"
  diye iddia etme.

DİĞER:
- Türkçe cevap ver
- Konuyla ilgisiz (muhasebe dışı) sorulara nazikçe "ben muhasebe konularında yardımcı
  olabilirim" de`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const yetki = await kullaniciDogrula(req);
    if (yetki instanceof Response) return yetki;

    const premium = await premiumKontrol(yetki.supabase, yetki.user.id);
    const admin = await adminKontrol(yetki.supabase);

    // Free: günlük kontör artır; Premium/Admin: bypass
    let kalan: number | null = null;
    if (!premium && !admin) {
      const { data: quota, error: qErr } = await yetki.supabase.rpc('ai_quota_artir', {
        _max: FREE_GUNLUK_LIMIT,
      });
      if (qErr) {
        return new Response(
          JSON.stringify({ hata: 'Kota kontrolü başarısız', detay: qErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (!quota?.izin_var) {
        return new Response(
          JSON.stringify({
            hata: 'Günlük AI sorgu hakkın doldu',
            limit: quota?.limit ?? FREE_GUNLUK_LIMIT,
            kalan: 0,
            premium_gerekli: true,
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      kalan = (quota.limit ?? FREE_GUNLUK_LIMIT) - (quota.sayac ?? 0);
    }

    const { mesajlar, baglam }: Istek = await req.json();

    if (!Array.isArray(mesajlar) || mesajlar.length === 0) {
      return new Response(JSON.stringify({ hata: 'Mesaj yok' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Güvenlik: son 10 mesajı tut, uzun konuşmaları kes
    const kesit = mesajlar.slice(-10);

    const stream = new URL(req.url).searchParams.get('stream') === '1';

    // ===========================================================
    // CACHE LOOKUP — sık sorulan tek mesajlık sorular için lokal cache.
    // Şartlar:
    //   - Conversation tek mesajlık (multi-turn unique kabul edilir)
    //   - Güncel veri sorgusu değil (Tavily tetiklenmiyor)
    // Hit olursa AI'a hiç gitmiyoruz — token tasarrufu + anlık cevap.
    // ===========================================================
    const sonKullaniciMesaj = [...kesit].reverse().find((m) => m.role === 'user');
    const sonKullaniciMetni = sonKullaniciMesaj?.content ?? '';
    const guncelVeriHint = sonKullaniciMetni && guncelBilgiGerekiyor(sonKullaniciMetni);

    let cacheHash: string | null = null;
    if (kesit.length === 1 && !guncelVeriHint && sonKullaniciMetni) {
      cacheHash = await sorguHash(sonKullaniciMetni, baglam);

      const { data: cached } = await yetki.supabase
        .from('ai_cevap_cache')
        .select('cevap, kaynaklar')
        .eq('soru_hash', cacheHash)
        .maybeSingle();

      if (cached) {
        // Hit sayacı + log (her ikisi de arka planda, response'u bekletme)
        yetki.supabase
          .rpc('ai_cache_hit', { _hash: cacheHash })
          .then(({ error }) => {
            if (error) console.error('ai_cache_hit hata:', error.message);
          });
        yetki.supabase
          .rpc('ai_log_yaz', {
            _ozellik: 'asistan_cache',
            _input_token: 0,
            _output_token: 0,
            _premium: premium || admin,
          })
          .then(({ error }) => {
            if (error) console.error('ai_log_yaz hata:', error.message);
          });

        const cachedKaynaklar = (cached.kaynaklar as unknown[] | null) ?? [];

        if (stream) {
          const encoder = new TextEncoder();
          const responseStream = new ReadableStream({
            async start(controller) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'meta', kalan, premium, cache: true })}\n\n`,
                ),
              );
              const kelimeler = (cached.cevap as string).split(/(\s+)/);
              for (const kelime of kelimeler) {
                if (!kelime) continue;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: kelime })}\n\n`),
                );
                await new Promise((r) => setTimeout(r, 8));
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
              controller.close();
            },
          });
          return new Response(responseStream, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-cache, no-transform',
              'X-Accel-Buffering': 'no',
            },
          });
        }

        return new Response(
          JSON.stringify({
            metin: cached.cevap,
            token: 0,
            kalan,
            premium,
            cache: true,
            kaynaklar: cachedKaynaklar,
            web_kaynaklar: [],
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // ===========================================================
    // RAG — kullanıcının son user mesajını + soru bağlamını embed et,
    // mevzuat_ara() ile en yakın chunk'ları çek
    // ===========================================================
    let mevzuatChunklar: MevzuatChunk[] = [];
    try {
      const sonKullanici = [...kesit].reverse().find((m) => m.role === 'user');
      if (sonKullanici?.content) {
        const sorguMetni = [
          baglam?.soruBaslik,
          baglam?.senaryo,
          sonKullanici.content,
        ]
          .filter(Boolean)
          .join('\n');

        const sorguEmb = await embedOpenAI(sorguMetni);
        const { data: chunks, error: aramaErr } = await yetki.supabase.rpc(
          'rag_ara',
          {
            _embedding: sorguEmb,
            _limit: MEVZUAT_TOP_K,
            _esik: MEVZUAT_MIN_BENZERLIK,
          },
        );
        if (!aramaErr && Array.isArray(chunks)) {
          mevzuatChunklar = (chunks as RagAraRow[]).map((c) => ({
            kaynak: c.kaynak_baslik,
            // chunk_baslik dolu ise onu (örn. "Madde 274 — Emtia"); değilse
            // kaynak başlığını kullan (TMS chunk'ları için)
            baslik: c.chunk_baslik ?? c.kaynak_baslik,
            madde_no: c.madde_no,
            url: c.kaynak_url,
            metin: c.metin,
            benzerlik: c.benzerlik,
          }));
        } else if (aramaErr) {
          console.error('rag_ara RPC hatası:', aramaErr.message);
        }
      }
    } catch (e) {
      // RAG hatası AI'ı bozmasın — sadece logla, mevzuatsız devam
      console.error('RAG retrieval hatası', (e as Error).message);
    }

    // ===========================================================
    // Tavily — kullanıcı GÜNCEL bilgi sorduysa resmi kaynaklardan ara
    // (mevzuat.gov.tr, gib.gov.tr, vb.) Soru içi ipucu / yanlış analizi
    // gibi sıradan kullanımda devreye girmez — sadece "yeni tebliğ
    // çıktı mı", "KDV oranı 2026'da kaç" tarzı sorularda.
    // ===========================================================
    let tavilySonuc: TavilySonuc | null = null;
    let guncelVeriIsteniyor = false;
    try {
      const sonKullanici = [...kesit].reverse().find((m) => m.role === 'user');
      if (sonKullanici?.content && guncelBilgiGerekiyor(sonKullanici.content)) {
        guncelVeriIsteniyor = true;
        tavilySonuc = await tavilyAra(sonKullanici.content, {
          maxSonuc: 3,
          sadeceResmi: true,
        });
      }
    } catch (e) {
      console.error('Tavily araması başarısız', (e as Error).message);
    }

    // ===========================================================
    // SYSTEM PROMPT inşası
    // ===========================================================
    let systemPrompt = SYSTEM_PROMPT_BAZ;
    if (baglam?.soruBaslik || baglam?.senaryo) {
      systemPrompt += `\n\n## Öğrencinin çözdüğü soru
**Başlık:** ${baglam.soruBaslik ?? '-'}
**Senaryo:** ${baglam.senaryo ?? '-'}

Bu soruyu doğrudan çözme ama ilgili kavramları anlamasına yardım et.`;
    }

    if (mevzuatChunklar.length > 0) {
      const mevzuatBlok = mevzuatChunklar
        .map(
          (c, i) =>
            `[${i + 1}] ${c.kaynak} — ${c.baslik}\n${c.metin}${c.url ? `\nKaynak: ${c.url}` : ''}`,
        )
        .join('\n\n---\n\n');
      systemPrompt += `\n\n## İlgili mevzuat (RAG retrieval)
Aşağıdaki resmi mevzuat parçaları öğrencinin sorusuyla ilişkili. Cevabını bu parçalardaki bilgiye dayandır,
ilgili madde/tebliğ adını parantez içinde belirt:

${mevzuatBlok}`;
    }

    if (tavilySonuc && tavilySonuc.kaynaklar.length > 0) {
      const tavilyBlok = tavilySonuc.kaynaklar
        .map(
          (k, i) =>
            `[Web ${i + 1}] ${k.baslik}\n${k.icerik.slice(0, 800)}\nKaynak: ${k.url}`,
        )
        .join('\n\n---\n\n');
      const ozetSatiri = tavilySonuc.ozet
        ? `\n**Web özeti:** ${tavilySonuc.ozet}\n`
        : '';
      systemPrompt += `\n\n## Güncel web kaynakları (Tavily — yalnız sen göreceksin)
Kullanıcı güncel/yeni bir bilgi sordu. Aşağıdaki resmi kaynaklar
(gib.gov.tr, mevzuat.gov.tr, resmigazete.gov.tr) anlık çekildi.
Bilgiyi cevabında kullan, ama URL/kaynak adı/site adresi YAZMA — sadece
güncel bilgiyi akıcı şekilde Türkçe ifade et:
${ozetSatiri}
${tavilyBlok}`;
    } else if (guncelVeriIsteniyor) {
      // Kullanıcı güncel oran/tutar sordu ama Tavily sonuç dönmedi (key yok,
      // whitelist boş, vs.) — AI'a açıkça uyarı ver, sayı UYDURMASIN.
      systemPrompt += `\n\n## ⚠️ GÜNCEL VERİ ÇEKİLEMEDİ
Kullanıcı güncel/yeni bir oran, tutar veya limit sordu ama resmi
kaynaklardan veri çekilemedi. **Spesifik sayı ASLA söyleme** — yukarıdaki
"GÜNCEL VERİ KORUMASI" kuralını uygula. Genel kavramı anlat ve
"güncel rakamı gib.gov.tr'den teyit et" yönlendirmesi yap.`;
    }

    // Streaming mode: URL'de ?stream=1 varsa SSE format yanıt döner.
    //
    // ÖNEMLİ NOT: Gemini streamGenerateContent gerçek streaming'i (geminiStream)
    // şu an stable değil — yeni 5-katman prompt + RAG inject ile output_token=0
    // sorunu yaşanıyor (sebep henüz tam anlaşılmadı). Geçici çözüm: stream
    // endpoint'ini koru ama içeride non-stream çağrısı (anthropicCagir) yap,
    // sonucu küçük parçalara bölerek SSE üzerinden gönder — UX bozulmasın,
    // kullanıcı yazıyor hissi devam etsin. Gerçek stream tekrar oturduğunda
    // geminiStream'e dönülebilir.
    if (stream) {
      const encoder = new TextEncoder();
      const responseStream = new ReadableStream({
        async start(controller) {
          // Açılış meta — quota ve premium bilgisi
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'meta', kalan, premium })}\n\n`,
            ),
          );

          try {
            // Non-stream çağrı — çalışıyor, output garanti
            const yanit = await anthropicCagir(systemPrompt, kesit, 1500);
            const metin = yanit.metin ?? '';

            // Kelime bazlı chunk'lara böl, küçük gecikme ile gönder
            // (gerçek streaming illüzyonu için)
            const kelimeler = metin.split(/(\s+)/); // boşlukları koru
            for (const kelime of kelimeler) {
              if (!kelime) continue;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: kelime })}\n\n`),
              );
              // 15ms gecikme = doğal yazma hızı hissi
              await new Promise((r) => setTimeout(r, 15));
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));

            // Maliyet izleme — gerçek token sayıları
            yetki.supabase
              .rpc('ai_log_yaz', {
                _ozellik: 'asistan',
                _input_token: yanit.inputToken ?? 0,
                _output_token: yanit.outputToken ?? 0,
                _premium: premium || admin,
              })
              .then(({ error }) => {
                if (error) console.error('ai_log_yaz hata:', error.message);
              });

            // Cache write — sadece cache-uygun (tek mesajlık, güncel veri yok)
            // sorgularda cacheHash dolar. Hit olmuş olsa zaten erkenden return
            // ediyorduk, buraya inmemişti.
            if (cacheHash && metin) {
              yetki.supabase
                .from('ai_cevap_cache')
                .upsert(
                  {
                    soru_hash: cacheHash,
                    soru_metni: sonKullaniciMetni,
                    baglam: baglam ?? null,
                    cevap: metin,
                    kaynaklar: mevzuatChunklar.map((c) => ({
                      kaynak: c.kaynak,
                      baslik: c.baslik,
                      madde_no: c.madde_no,
                      url: c.url,
                      benzerlik: Math.round(c.benzerlik * 100) / 100,
                    })),
                  },
                  { onConflict: 'soru_hash' },
                )
                .then(({ error }) => {
                  if (error) console.error('ai_cevap_cache upsert hata:', error.message);
                });
            }
          } catch (e) {
            console.error('Stream içinde non-stream çağrısı hatası:', (e as Error).message);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'error', message: (e as Error).message })}\n\n`,
              ),
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(responseStream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no', // proxy buffering kapat
        },
      });
    }

    // Non-stream (geri uyumluluk) — eski JSON yolu
    const yanit = await anthropicCagir(systemPrompt, kesit, 1500);

    // Maliyet izleme
    yetki.supabase
      .rpc('ai_log_yaz', {
        _ozellik: 'asistan',
        _input_token: yanit.inputToken ?? 0,
        _output_token: yanit.outputToken ?? 0,
        _premium: premium || admin,
      })
      .then(({ error }) => {
        if (error) console.error('ai_log_yaz hata:', error.message);
      });

    // Cache write — non-stream yolu
    if (cacheHash && yanit.metin) {
      yetki.supabase
        .from('ai_cevap_cache')
        .upsert(
          {
            soru_hash: cacheHash,
            soru_metni: sonKullaniciMetni,
            baglam: baglam ?? null,
            cevap: yanit.metin,
            kaynaklar: mevzuatChunklar.map((c) => ({
              kaynak: c.kaynak,
              baslik: c.baslik,
              madde_no: c.madde_no,
              url: c.url,
              benzerlik: Math.round(c.benzerlik * 100) / 100,
            })),
          },
          { onConflict: 'soru_hash' },
        )
        .then(({ error }) => {
          if (error) console.error('ai_cevap_cache upsert hata:', error.message);
        });
    }

    return new Response(
      JSON.stringify({
        metin: yanit.metin,
        token: yanit.inputToken + yanit.outputToken,
        kalan,
        premium,
        kaynaklar: mevzuatChunklar.map((c) => ({
          kaynak: c.kaynak,
          baslik: c.baslik,
          madde_no: c.madde_no,
          url: c.url,
          benzerlik: Math.round(c.benzerlik * 100) / 100,
        })),
        web_kaynaklar: tavilySonuc?.kaynaklar.map((k) => ({
          baslik: k.baslik,
          url: k.url,
          skor: Math.round(k.skor * 100) / 100,
        })) ?? [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ hata: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
