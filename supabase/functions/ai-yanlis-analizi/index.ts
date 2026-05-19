// AI Yanlış Analizi — yanlış yevmiye kaydını satır satır eleştirip doğruya yönlendirir
// Free: 3/gün (ai_quota_artir RPC), Premium: sınırsız.
// Prompt v2 (16 Mayıs 2026): öğrencinin yazdığı satıra birebir referans veren çıktı.

import { corsHeaders } from '../_shared/cors.ts';
import { kullaniciDogrula, premiumKontrol, adminKontrol } from '../_shared/auth.ts';
import { anthropicCagir } from '../_shared/anthropic.ts';

const FREE_GUNLUK_LIMIT = 3;

interface CozumSatir {
  kod: string;
  borc: number;
  alacak: number;
}

interface Istek {
  soruBaslik: string;
  senaryo: string;
  dogruCozum: CozumSatir[];
  kullaniciCevap: CozumSatir[];
}

const SYSTEM_PROMPT = `Sen Türk muhasebe öğrencilerine rehberlik eden deneyimli bir muhasebe öğretmenisin.
Tek Düzen Hesap Planı'na göre yevmiye kayıtlarını değerlendiriyorsun.

Öğrenci bir soruyu yanlış çözdü. Sana hem doğru çözümü hem de öğrencinin **gerçek** kayıt
satırlarını vereceğim. Görevin, öğrencinin yazdığı satıra **birebir referans vererek**
neyi yanlış yaptığını ve neden yanlış olduğunu açıklamak.

ÇIKTI YAPISI — KATI:

**Senin yazdığın satır:** Öğrencinin tam olarak yazdığı yanlış satırı **tırnak içinde**
ve hesap kodu + tutarıyla aynen yaz. Örnek: "153 TİCARİ MALLAR — Borç 10.000 TL".

**Bu yanlış çünkü:** Kavramsal sebep — hangi muhasebe ilkesi/mantığı ihlal edilmiş?
"Şu hesap olmalıydı" gibi yüzeysel açıklama YETERSİZ. "Bu işlem aslında bir
hammadde alımı değil ticari mal alımı, çünkü…" gibi düşünsel temele in.

**Doğrusu:** Doğru satırı yine **tırnak içinde** kod + tutar ile yaz. Örnek:
"150 İLK MADDE VE MALZEME — Borç 10.000 TL".

**İpucu:** Benzer soruda doğru karar vermek için kısa bir pratik kural (1 cümle).

DİĞER KURALLAR:
- Eğer öğrenci birden çok satırda hata yapmışsa, en kritik 1-2 hatayı seç,
  hepsini sıralama. Toplam çıktı 250 kelimeyi geçmesin.
- Yön hatası (borç/alacak karışmış) varsa açıkça söyle: "Bu hesap **borç**
  tarafına yazılmalıydı çünkü…"
- Eksik satır varsa: "Cevabında **191 İNDİRİLECEK KDV** satırı yok — alış faturasında
  KDV ödendiği için indirilebilir KDV olarak kaydedilmeli."
- Fazla satır varsa: "Yazdığın **600 YURTİÇİ SATIŞLAR** satırı gereksiz çünkü…"

Ton: sıcak, teşvik edici, akademik ama dostça. Asla küçümseme. Hata doğal karşıla.
Madde işaretleri yerine **kalın başlıklar** kullan. "Cevabın yanlış" gibi basit
ifadelerle başlama — doğrudan analize gir.`;

const formatSatir = (s: CozumSatir[]): string => {
  if (s.length === 0) return '(satır yok)';
  return s
    .map((r) => {
      const yon = r.borc > 0 ? `Borç ${r.borc.toLocaleString('tr-TR')} TL` : `Alacak ${r.alacak.toLocaleString('tr-TR')} TL`;
      return `- ${r.kod} — ${yon}`;
    })
    .join('\n');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const yetki = await kullaniciDogrula(req);
    if (yetki instanceof Response) return yetki;

    const premium = await premiumKontrol(yetki.supabase, yetki.user.id);
    const admin = await adminKontrol(yetki.supabase);

    // Free: günlük kota artır; Premium/Admin: bypass
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

    const { soruBaslik, senaryo, dogruCozum, kullaniciCevap }: Istek = await req.json();

    const mesaj = `**Soru:** ${soruBaslik}

**Senaryo:** ${senaryo}

**Doğru çözüm:**
${formatSatir(dogruCozum)}

**Öğrencinin yazdığı kayıt:**
${formatSatir(kullaniciCevap)}

Yukarıdaki sistem promptundaki yapıyı KATIYEN uygula: önce "Senin yazdığın satır",
sonra "Bu yanlış çünkü", sonra "Doğrusu", sonra "İpucu". Öğrencinin yazdığı satırı
tırnak içinde aynen referans al.`;

    const yanit = await anthropicCagir(SYSTEM_PROMPT, [{ role: 'user', content: mesaj }], 600);

    // Maliyet izleme — admin dashboard için (sessiz, başarısız olsa da AI yanıtını bloklamaz)
    yetki.supabase
      .rpc('ai_log_yaz', {
        _ozellik: 'yanlis_analizi',
        _input_token: yanit.inputToken ?? 0,
        _output_token: yanit.outputToken ?? 0,
        _premium: premium || admin,
      })
      .then(({ error }) => {
        if (error) console.error('ai_log_yaz hata:', error.message);
      });

    return new Response(
      JSON.stringify({
        metin: yanit.metin,
        token: yanit.inputToken + yanit.outputToken,
        kalan,
        premium,
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
