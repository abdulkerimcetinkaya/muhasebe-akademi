import { describe, expect, it } from 'vitest';
import { kesfetBloklariniAyir } from './kesfet-icerik';
import { laboratuvarConfig, varsayilanLaboratuvar } from './islem-laboratuvari-block';
import { bilgiDonusumuConfig } from './bilgi-donusumu-block';

describe('Keşfet içerik etkileşimleri', () => {
  it('eski kontrol ve kayıt bloklarını test modalında tutar', () => {
    const sonuc = kesfetBloklariniAyir([{ type: 'paragraph' }, { type: 'kontrol', props: {} }, { type: 'kayit' }]);
    expect(sonuc.test).toHaveLength(2);
    expect(sonuc.anlatim).toHaveLength(1);
  });

  it('satır içi kontrolü anlatım akışında bırakır', () => {
    const blok = { type: 'kontrol', props: { sunum: 'satirici', cokluSecim: true } };
    const sonuc = kesfetBloklariniAyir([blok]);
    expect(sonuc.test).toHaveLength(0);
    expect(sonuc.anlatim).toEqual([blok]);
  });

  it('laboratuvar yapılandırmasını varsayılanlarla tamamlar', () => {
    const sonuc = laboratuvarConfig('{"banka":245000,"tahsil":130000}');
    expect(sonuc.banka).toBe(245000);
    expect(sonuc.tahsil).toBe(130000);
    expect(sonuc.odeme).toBe(varsayilanLaboratuvar.odeme);
    expect(sonuc.nedenler).toHaveLength(3);
  });

  it('bozuk laboratuvar JSONunda güvenli varsayılana döner', () => {
    expect(laboratuvarConfig('{bozuk')).toEqual(varsayilanLaboratuvar);
  });

  it('bilgi dönüşümü olay yapılandırmasını doğrular ve bozuk JSONu güvenle karşılar', () => {
    expect(bilgiDonusumuConfig('{"olaylar":[{"baslik":"Satış","tutar":10,"tur":"satis"}]}').olaylar).toHaveLength(1);
    expect(bilgiDonusumuConfig('{bozuk').olaylar).toHaveLength(4);
  });
});
