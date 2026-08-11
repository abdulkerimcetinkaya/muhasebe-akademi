/* eslint-disable react-refresh/only-export-components */
import { createReactBlockSpec } from '@blocknote/react';
import { useState } from 'react';

export type LaboratuvarNedeni = { baslik: string; aciklama: string };
export type LaboratuvarConfig = {
  isletme?: string;
  banka?: number;
  min?: number;
  max?: number;
  adim?: number;
  tahsil?: number;
  odeme?: number;
  hareket?: number;
  nedenler?: LaboratuvarNedeni[];
};

export const varsayilanLaboratuvar: Required<LaboratuvarConfig> = {
  isletme: 'Ada Ticaret', banka: 200000, min: 0, max: 400000, adim: 10000,
  tahsil: 20000, odeme: 40000, hareket: 100000,
  nedenler: [
    { baslik: 'Bugün yapılan satışın bedeli tahsil edildi', aciklama: 'Yeni satış ve tahsilat aynı olayda gerçekleşti.' },
    { baslik: 'Müşteri önceki borcunu ödedi', aciklama: 'Yeni satış yok; daha önce oluşmuş alacak tahsil edildi.' },
    { baslik: 'Banka kredisi kullanıldı', aciklama: 'Para arttı fakat geri ödeme yükümlülüğü de doğdu.' },
  ],
};

export const laboratuvarConfig = (raw: string): Required<LaboratuvarConfig> => {
  try {
    return { ...varsayilanLaboratuvar, ...(JSON.parse(raw) as LaboratuvarConfig) };
  } catch {
    return varsayilanLaboratuvar;
  }
};

const para = (n: number) => `${n.toLocaleString('tr-TR')} TL`;

export const IslemLaboratuvariBlock = createReactBlockSpec(
  {
    type: 'islemlaboratuvari',
    propSchema: { baslik: { default: 'Aynı para, farklı işletme' }, config: { default: '{}' } },
    content: 'none',
  },
  {
    render: ({ block, editor }) => editor.isEditable ? (
      <div className="bn-lab-editor" contentEditable={false}>
        <input value={block.props.baslik} onChange={(e) => editor.updateBlock(block, { props: { baslik: e.target.value } })} placeholder="Laboratuvar başlığı" />
        <textarea rows={12} value={block.props.config} onChange={(e) => editor.updateBlock(block, { props: { config: e.target.value } })} aria-label="Laboratuvar JSON" />
      </div>
    ) : <IslemLaboratuvari baslik={block.props.baslik} config={laboratuvarConfig(block.props.config)} />,
  },
);

export const IslemLaboratuvari = ({ baslik, config }: { baslik: string; config: Required<LaboratuvarConfig> }) => {
  const [tahsil, setTahsil] = useState(config.tahsil);
  const [odeme, setOdeme] = useState(config.odeme);
  const [neden, setNeden] = useState(0);
  return (
    <section className="bn-lab" contentEditable={false} aria-label="İşlem Laboratuvarı">
      <div className="bn-lab-etiket">İşlem Laboratuvarı</div>
      <h3>{baslik}</h3>
      <p className="bn-lab-isletme">{config.isletme}</p>
      <div className="bn-lab-banka"><span>Bankadaki para</span><strong className="tnum">{para(config.banka)}</strong></div>
      <label className="bn-lab-slider"><span>Müşterilerden tahsil edilecek <strong>{para(tahsil)}</strong></span><input aria-label="Tahsil edilecek" type="range" min={config.min} max={config.max} step={config.adim} value={tahsil} onChange={(e) => setTahsil(Number(e.target.value))} /></label>
      <label className="bn-lab-slider"><span>Yapılacak ödemeler <strong>{para(odeme)}</strong></span><input aria-label="Yapılacak ödemeler" type="range" min={config.min} max={config.max} step={config.adim} value={odeme} onChange={(e) => setOdeme(Number(e.target.value))} /></label>
      <p className="bn-lab-mesaj">Banka bakiyesi aynı kaldı. İşletme hakkında sahip olduğun bilgi ise değişti.</p>
      <div className="bn-lab-ayrac" />
      <h4>Banka hareketinin nedenini değiştir</h4>
      <div className="bn-lab-hareket">Bankaya <strong className="tnum">+{para(config.hareket)}</strong> geldi</div>
      <div className="bn-lab-nedenler">
        {config.nedenler.map((secenek, index) => <button type="button" className={neden === index ? 'aktif' : ''} onClick={() => setNeden(index)} key={secenek.baslik}>{secenek.baslik}</button>)}
      </div>
      <div className="bn-lab-sonuc"><strong>İşletme olayı değişti.</strong><span>{config.nedenler[neden]?.aciklama}</span></div>
    </section>
  );
};
