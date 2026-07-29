import { Icon } from './Icon';
import type { MevzuatKatmani } from '../lib/sozluk';

/**
 * Mevzuat gövdesi — "Kanun ne diyor?" (maddeler, lafzıyla) + "Özet · Pratik"
 * (başlıklı gruplar). Hem sağ panelde (MevzuatPaneli) hem sözlük tam sayfasında
 * (SozlukTerimSayfasi) aynı bileşen kullanılır → görünüm birebir tutarlı.
 */
export const MevzuatGovde = ({ mevzuat }: { mevzuat?: MevzuatKatmani }) => {
  const maddeler = mevzuat?.maddeler ?? [];
  const ozet = mevzuat?.ozet ?? [];
  if (maddeler.length === 0 && ozet.length === 0) return null;

  return (
    <div className="mvz-govde-icerik">
      {maddeler.length > 0 && (
        <section className="mvz-bolum">
          <div className="mvz-bolum-baslik">
            <Icon name="Scale" size={15} />
            Kanun ne diyor?
          </div>
          <div className="mvz-maddeler">
            {maddeler.map((m, i) => (
              <div key={i} className="mvz-madde">
                <div className="mvz-madde-ust">
                  <span className="mvz-kanun">{m.kanun}</span>
                  <span className="mvz-madde-no">md. {m.madde}</span>
                  {m.baslik && <span className="mvz-madde-baslik">{m.baslik}</span>}
                </div>
                <blockquote className="mvz-lafiz">{m.lafiz}</blockquote>
              </div>
            ))}
          </div>
        </section>
      )}

      {ozet.length > 0 && (
        <section className="mvz-bolum">
          <div className="mvz-bolum-baslik">
            <Icon name="ListChecks" size={15} />
            Özet · Pratik
          </div>
          <div className="mvz-ozet-gruplar">
            {ozet.map((g, i) => (
              <div key={i} className="mvz-ozet-grup">
                <div className="mvz-ozet-grup-baslik">{g.baslik}</div>
                <ul className="mvz-ozet-liste">
                  {g.maddeler.map((md, j) => (
                    <li key={j}>{md}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
