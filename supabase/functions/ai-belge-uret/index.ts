// AI Belge Üretici — soru senaryosundan muhasebe belgeleri (fatura, çek, senet, dekont, perakende fiş) üretir
// Sadece admin kullanabilir.

import { corsHeaders } from '../_shared/cors.ts';
import { kullaniciDogrula, adminKontrol } from '../_shared/auth.ts';
import { anthropicCagir } from '../_shared/anthropic.ts';

interface CozumSatir {
  kod: string;
  borc: number;
  alacak: number;
}

interface Istek {
  soruBaslik: string;
  senaryo: string;
  aciklama?: string;
  cozum: CozumSatir[];
}

const SYSTEM_PROMPT = `Sen Türk muhasebe sorularına uygun gerçekçi belge verisi üreten bir araçsın.
Çıktın MUTLAKA geçerli JSON olmalı — başka açıklama, kod bloğu, markdown, yorum YOK.

Sana bir muhasebe sorusunun başlığı, senaryosu, açıklaması ve doğru yevmiye kaydı veriliyor.
Görevin: senaryoya uyan 1-2 belge üretmek. Genelde 1 belge yeterli; sadece senaryoda iki farklı
işlem belgesi geçiyorsa (örn. mal alışı + ödeme çeki) 2 belge üret.

Belge tipleri: "fatura", "perakende-fis", "cek", "senet", "dekont".

Seçim kuralları:
- Ticari fatura, KDV'li satış/alış → fatura
- Süpermarket/market satışı, perakende → perakende-fis
- Çek düzenleme/tahsil → cek
- Senet düzenleme/tahsil → senet
- Banka havalesi/EFT, kredi, faiz, masraf → dekont

Gerçekçi Türk unvanları kullan ("Deniz Tekstil Ltd. Şti.", "ABC Mobilya A.Ş."),
geçerli format VKN (10 hane), TC (11 hane), IBAN (TR + 24 hane).
Tutarları çözümdeki borç/alacak satırlarından çıkar. Tarihleri yakın geçmiş (2025-2026) kullan.

BELGE NUMARASI FORMATI (zorunlu):
- Fatura → faturaNo: 16 karakter, "ABC[YIL]000000001" formatında.
    • İlk 3 harf: işletmenin ünsuz-ağırlıklı kısaltması.
      Algoritma: Türkçe harfleri ASCII'ye çevir (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u),
      büyük harf yap, ilk harf ünlüyse al, sonra sadece ünsuzları al; 3 harfe ulaşana kadar.
      Örnek: "Yıldız Beyaz Eşya" → YLD, "Demirören" → DMR, "Bosch" → BSC,
              "Akel" → AKL, "Mavi Toptan" → MVT.
      Alış faturasında SATICI unvanı, satış faturasında ALICI unvanı kullanılır.
    • Sonraki 4 hane: belgenin tarihindeki yıl (örn. 2025).
    • Son 9 hane: sıra numarası, soldan sıfır dolgulu, 000000001'den başlar.
    • Örnek: "YLD2025000000001", "DMR2026000000002".
- Dekont → dekontNo: 6 haneli sıralı sayı, soldan sıfır dolgulu.
    • Örnek: "000001", "000437".
- Perakende fiş → fisNo: tek soruda üretiliyor — 6-8 haneli sayı uydur.
- Çek → cekNo: 7 haneli sayı uydur (örn. "1234567").
- Senet → senetNo: 6 haneli sayı uydur.

ÇIKTI FORMATI — kesin şema:
{
  "belgeler": [
    {
      "tur": "fatura",
      "baslik": "string? opsiyonel",
      "faturaTipi": "satis" | "alis" | "iade",
      "faturaNo": "string",
      "tarih": "YYYY-MM-DD",
      "ettn": "string? opsiyonel UUID",
      "satici": { "unvan": "string", "vkn": "string 10 hane", "vergiDairesi": "string?", "adres": "string?" },
      "alici":  { "unvan": "string", "vkn": "string 10 hane" VEYA "tcKimlik": "string 11 hane", "vergiDairesi": "string?", "adres": "string?" },
      "kalemler": [
        { "aciklama": "string", "miktar": number, "birim": "string (Adet/Kg/M²/Lt)", "birimFiyat": number, "iskontoOrani": number? }
      ],
      "kdvOrani": number (20 default, 10 gıda, 1 bazı tarım ürünleri),
      "not": "string? opsiyonel"
    }
    VEYA
    {
      "tur": "perakende-fis",
      "fisNo": "string",
      "tarih": "YYYY-MM-DD",
      "saat": "HH:mm",
      "isletme": { "unvan": "string", "vkn": "string 10 hane", "vergiDairesi": "string?", "adres": "string?" },
      "kalemler": [
        { "aciklama": "string", "miktar": number, "birimFiyat": number, "kdvOrani": number }
      ],
      "odemeYontemi": "NAKIT" | "KART" | "KARMA"
    }
    VEYA
    {
      "tur": "cek",
      "cekNo": "string",
      "bankaAdi": "string (örn. Türkiye İş Bankası)",
      "subeAdi": "string?",
      "iban": "string TR + 24 hane opsiyonel",
      "duzenlemeTarihi": "YYYY-MM-DD",
      "vadeTarihi": "YYYY-MM-DD",
      "tutar": number,
      "lehtar": "string",
      "kesideci": { "unvan": "string", "vkn": "string" }
    }
    VEYA
    {
      "tur": "senet",
      "senetTipi": "bono" | "police",
      "senetNo": "string",
      "duzenlemeTarihi": "YYYY-MM-DD",
      "vadeTarihi": "YYYY-MM-DD",
      "tutar": number,
      "lehtar": { "unvan": "string", "vkn": "string?" },
      "borclu": { "unvan": "string", "vkn": "string?" }
    }
    VEYA
    {
      "tur": "dekont",
      "bankaAdi": "string",
      "subeAdi": "string?",
      "dekontNo": "string",
      "islemTarihi": "YYYY-MM-DD",
      "islemSaati": "HH:mm?",
      "islemTuru": "HAVALE" | "EFT" | "KREDI_KULLANIMI" | "KREDI_TAKSIT" | "MASRAF" | "FAIZ_GELIRI" | "POS_TAHSILATI",
      "aciklama": "string",
      "hesapSahibi": { "unvan": "string", "vkn": "string?" },
      "iban": "string TR + 24 hane",
      "karsiTaraf": { "unvan": "string" } opsiyonel,
      "karsiIban": "string opsiyonel",
      "tutar": number,
      "yon": "BORC" | "ALACAK"
    }
  ]
}

Sadece JSON döndür. Başka hiçbir şey yazma.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const yetki = await kullaniciDogrula(req);
    if (yetki instanceof Response) return yetki;

    if (!(await adminKontrol(yetki.supabase, 'icerik'))) {
      return new Response(
        JSON.stringify({ hata: 'Bu işlem admin yetkisi gerektirir (içerik rolü)' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { soruBaslik, senaryo, aciklama, cozum }: Istek = await req.json();

    const cozumFmt = cozum
      .map((s) => `- ${s.kod}: Borç ${s.borc}, Alacak ${s.alacak}`)
      .join('\n');

    const mesaj = `**Soru başlığı:** ${soruBaslik}

**Senaryo:** ${senaryo}

${aciklama ? `**Açıklama:** ${aciklama}\n\n` : ''}**Doğru yevmiye kaydı:**
${cozumFmt}

Bu soruya uygun belge(leri) JSON formatında üret.`;

    const yanit = await anthropicCagir(
      SYSTEM_PROMPT,
      [{ role: 'user', content: mesaj }],
      4000,
      { jsonMode: true },
    );

    // JSON parse — model bazen markdown kod bloğu döndürebilir, temizle
    const temiz = yanit.metin
      .trim()
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '');

    let parsed: unknown;
    try {
      parsed = JSON.parse(temiz);
    } catch {
      return new Response(
        JSON.stringify({ hata: 'AI geçersiz JSON döndürdü', cikti: yanit.metin }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const belgeler = (parsed as { belgeler?: unknown[] })?.belgeler;
    if (!Array.isArray(belgeler)) {
      return new Response(
        JSON.stringify({ hata: 'AI yanıtında belgeler dizisi bulunamadı', cikti: parsed }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Maliyet izleme — admin dashboard için
    yetki.supabase
      .rpc('ai_log_yaz', {
        _ozellik: 'belge_uret',
        _input_token: yanit.inputToken ?? 0,
        _output_token: yanit.outputToken ?? 0,
        _premium: true,
      })
      .then(({ error }) => {
        if (error) console.error('ai_log_yaz hata:', error.message);
      });

    return new Response(
      JSON.stringify({ belgeler, token: yanit.inputToken + yanit.outputToken }),
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
