// MuhasebeAkademi — Mevzuat chunk embed kanalı (admin)
// Admin paneli mevzuat JSON'u POST eder, fonksiyon her chunk'ı embedler ve
// `mevzuat_chunklar` tablosuna yazar. Aynı chunk yeniden gönderilirse
// (kaynak + baslik) bazlı upsert davranışı yok — yenisi eklenir; admin önce silmeli.

import { corsHeaders } from '../_shared/cors.ts';
import { kullaniciDogrula, adminKontrol } from '../_shared/auth.ts';
import { embed } from '../_shared/embed.ts';

interface Chunk {
  kaynak: string;
  baslik: string;
  url?: string;
  metin: string;
  guncellendi?: string; // ISO date
}

interface Istek {
  chunklar: Chunk[];
}

const MAX_CHUNK_PER_BATCH = 50;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Auth — sadece admin
    const yetki = await kullaniciDogrula(req);
    if (yetki instanceof Response) return yetki;
    if (!(await adminKontrol(yetki.supabase, 'icerik'))) {
      return new Response(JSON.stringify({ hata: 'Yetki yok' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { chunklar }: Istek = await req.json();

    if (!Array.isArray(chunklar) || chunklar.length === 0) {
      return new Response(JSON.stringify({ hata: 'Chunk listesi boş' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (chunklar.length > MAX_CHUNK_PER_BATCH) {
      return new Response(
        JSON.stringify({
          hata: `Tek seferde en fazla ${MAX_CHUNK_PER_BATCH} chunk gönderebilirsin`,
          alinan: chunklar.length,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validasyon
    for (let i = 0; i < chunklar.length; i++) {
      const c = chunklar[i];
      if (!c.kaynak?.trim() || !c.baslik?.trim() || !c.metin?.trim()) {
        return new Response(
          JSON.stringify({
            hata: `${i + 1}. chunk eksik alan içeriyor (kaynak / baslik / metin zorunlu)`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (c.metin.length > 4000) {
        return new Response(
          JSON.stringify({
            hata: `${i + 1}. chunk çok uzun (${c.metin.length} karakter, max 4000)`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Embed et — sırayla. Aynı (kaynak, baslik) ile mevcut satır varsa üzerine yazar (upsert).
    const eklenenler: { kaynak: string; baslik: string }[] = [];
    const hatalar: { index: number; baslik: string; hata: string }[] = [];

    for (let i = 0; i < chunklar.length; i++) {
      const c = chunklar[i];
      try {
        const vec = await embed(c.metin, 'passage');
        const { error: upsertErr } = await yetki.supabase
          .from('mevzuat_chunklar')
          .upsert(
            {
              kaynak: c.kaynak.trim(),
              baslik: c.baslik.trim(),
              url: c.url?.trim() || null,
              metin: c.metin.trim(),
              embedding: vec,
              guncellendi: c.guncellendi || null,
            },
            { onConflict: 'kaynak,baslik' },
          );
        if (upsertErr) {
          hatalar.push({ index: i, baslik: c.baslik, hata: upsertErr.message });
        } else {
          eklenenler.push({ kaynak: c.kaynak, baslik: c.baslik });
        }
      } catch (e) {
        hatalar.push({ index: i, baslik: c.baslik, hata: (e as Error).message });
      }
      // Edge Function compute resource'una nazik (her embed gte-small belleği yükler)
      if (i < chunklar.length - 1) await new Promise((r) => setTimeout(r, 200));
    }

    return new Response(
      JSON.stringify({
        eklendi: eklenenler.length,
        hata: hatalar.length,
        eklenenler,
        hatalar,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('mevzuat-embed hata', e);
    return new Response(JSON.stringify({ hata: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
