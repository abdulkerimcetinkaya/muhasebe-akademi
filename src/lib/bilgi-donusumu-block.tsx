/* eslint-disable react-refresh/only-export-components */
import { createReactBlockSpec } from '@blocknote/react';
import { useMemo, useState } from 'react';

type Olay = { baslik: string; tutar: number; tur: 'satis' | 'tahsilat' | 'alis' | 'odeme' };
type Config = { olaylar: Olay[] };
const varsayilan: Config = { olaylar: [
  { baslik: 'Müşteriye satış yapıldı', tutar: 100000, tur: 'satis' },
  { baslik: 'Müşteri ödeme yaptı', tutar: 60000, tur: 'tahsilat' },
  { baslik: 'Tedarikçiden mal alındı', tutar: 70000, tur: 'alis' },
  { baslik: 'Tedarikçiye ödeme yapıldı', tutar: 20000, tur: 'odeme' },
] };

export const bilgiDonusumuConfig = (raw: string): Config => {
  try { const parsed = JSON.parse(raw) as Config; return Array.isArray(parsed.olaylar) ? parsed : varsayilan; }
  catch { return varsayilan; }
};
const para = (n: number) => `${n.toLocaleString('tr-TR')} TL`;

export const BilgiDonusumuBlock = createReactBlockSpec(
  { type: 'bilgidonusumu', propSchema: { baslik: { default: 'Dağınık Bilgiden Anlamlı Bilgiye' }, config: { default: '{}' } }, content: 'none' },
  { render: ({ block, editor }) => editor.isEditable ? (
    <div className="bn-bd-editor" contentEditable={false}>
      <input value={block.props.baslik} onChange={(e) => editor.updateBlock(block,{props:{baslik:e.target.value}})} />
      <textarea rows={12} value={block.props.config} onChange={(e) => editor.updateBlock(block,{props:{config:e.target.value}})} aria-label="Bilgi dönüşümü JSON" />
    </div>
  ) : <BilgiDonusumu baslik={block.props.baslik} config={bilgiDonusumuConfig(block.props.config)} /> },
);

export const BilgiDonusumu = ({ baslik, config }: { baslik: string; config: Config }) => {
  const [soru, setSoru] = useState<'tahsil'|'odeme'|'tum'>('tum');
  const [sistemAcik, setSistemAcik] = useState(true);
  const ilgili = useMemo(() => config.olaylar.filter((o) => soru === 'tum' || (soru === 'tahsil' ? o.tur === 'satis' || o.tur === 'tahsilat' : o.tur === 'alis' || o.tur === 'odeme')), [config.olaylar,soru]);
  const tahsilEdilecek = config.olaylar.filter((o)=>o.tur==='satis').reduce((t,o)=>t+o.tutar,0)-config.olaylar.filter((o)=>o.tur==='tahsilat').reduce((t,o)=>t+o.tutar,0);
  const odenecek = config.olaylar.filter((o)=>o.tur==='alis').reduce((t,o)=>t+o.tutar,0)-config.olaylar.filter((o)=>o.tur==='odeme').reduce((t,o)=>t+o.tutar,0);
  return <section className={`bn-bd ${sistemAcik?'':'kapali'}`} contentEditable={false} aria-label="Muhasebe Laboratuvarı">
    <div className="bn-lab-etiket">Muhasebe Laboratuvarı</div><h3>{baslik}</h3>
    <div className="bn-bd-akis">
      <div><h4>İşletme olayları</h4>{config.olaylar.map((o,i)=><article className={ilgili.includes(o)?'aktif':'pasif'} key={`${o.baslik}-${i}`}><span>{sistemAcik?o.baslik:para(o.tutar)}</span>{sistemAcik&&<strong>{para(o.tutar)}</strong>}</article>)}</div>
      <div className="bn-bd-motor"><strong>MUHASEBE</strong><span>{sistemAcik?'Bilgiyi düzenler ve işler':'Sistem kapalı'}</span></div>
      <div><h4>Anlamlı finansal bilgi</h4>{sistemAcik?<div className="bn-bd-cikti"><span>{soru==='tahsil'?'Müşteriden tahsil edilecek':soru==='odeme'?'Tedarikçiye ödenecek':'Gerçekleşen olay'}</span><strong>{soru==='tahsil'?para(tahsilEdilecek):soru==='odeme'?para(odenecek):`${config.olaylar.length} işlem`}</strong></div>:<p className="bn-bd-belirsiz">Bağlam ve ilişkiler olmadan soruya cevap verilemiyor.</p>}</div>
    </div>
    <div className="bn-bd-sorular"><span>Bana şunu göster:</span><button className={soru==='tahsil'?'aktif':''} onClick={()=>setSoru('tahsil')}>Tahsil edilecek</button><button className={soru==='odeme'?'aktif':''} onClick={()=>setSoru('odeme')}>Yapılacak ödeme</button><button className={soru==='tum'?'aktif':''} onClick={()=>setSoru('tum')}>Bütün olaylar</button></div>
    <button type="button" className="bn-bd-kapat" onClick={()=>setSistemAcik((v)=>!v)}>{sistemAcik?'Muhasebe sistemini kapat':'Muhasebe sistemini aç'}</button>
    <p className="bn-lab-mesaj">{sistemAcik?'Muhasebe yalnızca bilgiyi saklamaz. İhtiyaç duyulan bilgiyi üretmek için onu düzenler.':'Rakam tek başına bilgi değildir; bağlam ve düzen gerekir.'}</p>
  </section>;
};
