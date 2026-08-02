import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { AdminSayfaBaslik } from '../../components/AdminSayfaBaslik';
import {
  bildirimGuncelle,
  bildirimSil,
  bildirimYarat,
  tumBildirimleriYukleAdmin,
  type Bildirim,
  type BildirimHedefTipi,
  type BildirimTip,
} from '../../lib/bildirimler';
import {
  tumKullanicilariYukle,
  type KullaniciOzet,
} from '../../lib/admin-kullanicilar';

const TIPLER: BildirimTip[] = ['duyuru', 'bilgi', 'uyari', 'guncelleme'];
const TIP_LABEL: Record<BildirimTip, string> = {
  duyuru: 'Duyuru',
  bilgi: 'Bilgi',
  uyari: 'Uyarı',
  guncelleme: 'Güncelleme',
};

export const AdminBildirimlerSayfasi = () => {
  const [list, setList] = useState<Bildirim[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState<string | null>(null);

  // Form state
  const [baslik, setBaslik] = useState('');
  const [metin, setMetin] = useState('');
  const [tip, setTip] = useState<BildirimTip>('duyuru');
  const [link, setLink] = useState('');
  const [yayinda, setYayinda] = useState(true);
  const [hedefTipi, setHedefTipi] = useState<BildirimHedefTipi>('herkes');
  const [hedefUserIds, setHedefUserIds] = useState<string[]>([]);
  const [hedefArama, setHedefArama] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);

  // Kullanıcı listesi (hedef seçici için, lazy yüklenir)
  const [kullaniciList, setKullaniciList] = useState<KullaniciOzet[]>([]);
  const [kullaniciYukleniyor, setKullaniciYukleniyor] = useState(false);

  const yukle = async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const data = await tumBildirimleriYukleAdmin();
      setList(data);
    } catch (e) {
      setHata(`Yüklenemedi: ${(e as Error).message}`);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    yukle();
  }, []);

  // Hedef "belirli" seçilince kullanıcıları lazy yükle
  useEffect(() => {
    if (hedefTipi === 'belirli' && kullaniciList.length === 0 && !kullaniciYukleniyor) {
      setKullaniciYukleniyor(true);
      tumKullanicilariYukle()
        .then(setKullaniciList)
        .catch(() => setKullaniciList([]))
        .finally(() => setKullaniciYukleniyor(false));
    }
  }, [hedefTipi, kullaniciList.length, kullaniciYukleniyor]);

  const filtreliKullanici = useMemo(() => {
    if (!hedefArama.trim()) return kullaniciList;
    const q = hedefArama.toLowerCase();
    return kullaniciList.filter(
      (k) =>
        k.kullanici_adi.toLowerCase().includes(q) ||
        (k.email ?? '').toLowerCase().includes(q),
    );
  }, [kullaniciList, hedefArama]);

  const formuTemizle = () => {
    setBaslik('');
    setMetin('');
    setTip('duyuru');
    setLink('');
    setYayinda(true);
    setHedefTipi('herkes');
    setHedefUserIds([]);
    setHedefArama('');
  };

  const yarat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baslik.trim() || !metin.trim()) return;
    if (hedefTipi === 'belirli' && hedefUserIds.length === 0) {
      setHata('Belirli kullanıcı hedeflemesi seçildi ama hiç kullanıcı seçilmedi.');
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    setBasarili(null);
    try {
      await bildirimYarat({
        baslik: baslik.trim(),
        metin: metin.trim(),
        tip,
        link: link.trim() || null,
        yayinda,
        hedef_tipi: hedefTipi,
        hedef_user_ids: hedefTipi === 'belirli' ? hedefUserIds : undefined,
      });
      const hedefAck =
        hedefTipi === 'belirli' ? ` (${hedefUserIds.length} kişiye)` : '';
      setBasarili(
        yayinda ? `Bildirim yayınlandı${hedefAck}.` : 'Taslak kaydedildi.',
      );
      formuTemizle();
      await yukle();
      setTimeout(() => setBasarili(null), 3000);
    } catch (e) {
      setHata(`Gönderilemedi: ${(e as Error).message}`);
    } finally {
      setGonderiliyor(false);
    }
  };

  const sil = async (id: string) => {
    if (!confirm('Bu bildirimi silmek istiyor musun? Geri alınamaz.')) return;
    try {
      await bildirimSil(id);
      setList((prev) => prev.filter((b) => b.id !== id));
    } catch (e) {
      alert(`Silinemedi: ${(e as Error).message}`);
    }
  };

  const yayinDegistir = async (b: Bildirim) => {
    try {
      await bildirimGuncelle(b.id, { yayinda: !b.yayinda });
      setList((prev) =>
        prev.map((x) => (x.id === b.id ? { ...x, yayinda: !x.yayinda } : x)),
      );
    } catch (e) {
      alert(`Güncellenemedi: ${(e as Error).message}`);
    }
  };

  return (
    <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8">
      <div className="flex gap-8">
        <AdminYanMenu />
        <main className="flex-1 min-w-0 space-y-8">
          <AdminSayfaBaslik
            baslik="Bildirimler"
            aciklama="Yayınladığın bildirim, oturum açmış tüm kullanıcıların çan ikonunda görünür."
          />

          {/* Yeni bildirim formu */}
          <section className="bg-surface border border-line rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold mb-4">Yeni Bildirim</h2>
            <form onSubmit={yarat} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                    Başlık
                  </label>
                  <input
                    type="text"
                    value={baslik}
                    onChange={(e) => setBaslik(e.target.value)}
                    maxLength={200}
                    required
                    placeholder="Örn: Yeni soru paketi yayında"
                    className="w-full px-3 py-2.5 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                    Tip
                  </label>
                  <select
                    value={tip}
                    onChange={(e) => setTip(e.target.value as BildirimTip)}
                    className="w-full px-3 py-2.5 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink"
                  >
                    {TIPLER.map((t) => (
                      <option key={t} value={t}>
                        {TIP_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                  Metin
                </label>
                <textarea
                  value={metin}
                  onChange={(e) => setMetin(e.target.value)}
                  maxLength={2000}
                  required
                  rows={4}
                  placeholder="Kullanıcıya gösterilecek mesaj..."
                  className="w-full px-3 py-2.5 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink focus:ring-2 focus:ring-blue-500/15 resize-none"
                />
                <div className="text-[10px] text-ink-quiet mt-1 text-right font-mono">
                  {metin.length} / 2000
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                    Link <span className="text-ink-quiet">(opsiyonel)</span>
                  </label>
                  <input
                    type="text"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="/isletmeler/3 — tıklanırsa bu route'a gider"
                    className="w-full px-3 py-2.5 bg-bg-tint border border-line-strong rounded-lg text-sm font-mono outline-none focus:border-ink"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pb-3">
                  <input
                    type="checkbox"
                    checked={yayinda}
                    onChange={(e) => setYayinda(e.target.checked)}
                    className="w-4 h-4 rounded border-line-strong cursor-pointer"
                  />
                  <span className="text-sm font-medium">Hemen yayınla</span>
                </label>
              </div>

              {/* Hedefleme */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-2">
                    Hedef
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setHedefTipi('herkes')}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-bold rounded-lg border transition ${
 hedefTipi === 'herkes'
 ? 'bg-ink text-bg border-ink'
 : 'border-line-strong hover:bg-bg-tint '
 }`}
                    >
                      <Icon name="Users" size={12} />
                      Herkese
                    </button>
                    <button
                      type="button"
                      onClick={() => setHedefTipi('premium')}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-bold rounded-lg border transition ${
 hedefTipi === 'premium'
 ? 'bg-success text-bg border-success'
 : 'border-line-strong hover:bg-bg-tint '
 }`}
                    >
                      <Icon name="Sparkles" size={12} />
                      Premium
                    </button>
                    <button
                      type="button"
                      onClick={() => setHedefTipi('free')}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-bold rounded-lg border transition ${
 hedefTipi === 'free'
 ? 'bg-ink-soft text-bg border-ink-soft'
 : 'border-line-strong hover:bg-bg-tint '
 }`}
                    >
                      <Icon name="User" size={12} />
                      Free
                    </button>
                    <button
                      type="button"
                      onClick={() => setHedefTipi('belirli')}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-bold rounded-lg border transition ${
 hedefTipi === 'belirli'
 ? 'bg-brand text-bg border-brand'
 : 'border-line-strong hover:bg-bg-tint '
 }`}
                    >
                      <Icon name="UserPlus" size={12} />
                      Belirli ({hedefUserIds.length})
                    </button>
                  </div>
                </div>

                {hedefTipi === 'belirli' && (
                  <div className="border border-line rounded-lg p-3 space-y-2 max-h-72 overflow-auto">
                    <input
                      type="text"
                      value={hedefArama}
                      onChange={(e) => setHedefArama(e.target.value)}
                      placeholder="Ara: kullanıcı adı veya email"
                      className="w-full px-2.5 py-1.5 bg-bg-tint border border-line-strong rounded text-[12px] font-medium outline-none focus:border-ink"
                    />
                    {kullaniciYukleniyor ? (
                      <div className="text-[12px] text-ink-quiet py-2">
                        Yükleniyor…
                      </div>
                    ) : filtreliKullanici.length === 0 ? (
                      <div className="text-[12px] text-ink-quiet py-2">
                        Eşleşen kullanıcı yok.
                      </div>
                    ) : (
                      filtreliKullanici.slice(0, 50).map((k) => (
                        <label
                          key={k.id}
                          className="flex items-center gap-2 px-2 py-1 hover:bg-bg-tint rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={hedefUserIds.includes(k.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setHedefUserIds((p) => [...p, k.id]);
                              } else {
                                setHedefUserIds((p) => p.filter((id) => id !== k.id));
                              }
                            }}
                            className="w-3.5 h-3.5 rounded border-line-strong"
                          />
                          <span className="text-[12.5px] font-medium flex-1 truncate">
                            {k.kullanici_adi}
                          </span>
                          <span className="text-[11px] font-mono text-ink-mute truncate">
                            {k.email ?? '—'}
                          </span>
                          {k.premium_aktif && (
                            <Icon
                              name="Sparkles"
                              size={11}
                              className="text-success dark:text-success flex-shrink-0"
                            />
                          )}
                        </label>
                      ))
                    )}
                    {filtreliKullanici.length > 50 && (
                      <div className="text-[10px] text-ink-quiet text-center py-1">
                        İlk 50 sonuç gösteriliyor — daha fazlası için arama daralt
                      </div>
                    )}
                  </div>
                )}
              </div>
              {hata && (
                <div className="flex items-start gap-2 p-3 bg-danger-soft border border-danger-soft rounded-lg text-[13px] text-danger font-medium">
                  <Icon name="AlertCircle" size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{hata}</span>
                </div>
              )}
              {basarili && (
                <div className="flex items-start gap-2 p-3 bg-success-soft border border-success-soft rounded-lg text-[13px] text-success font-medium">
                  <Icon name="CheckCircle2" size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{basarili}</span>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={gonderiliyor || !baslik.trim() || !metin.trim()}
                  className="inline-flex items-center gap-2 bg-ink text-bg px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase font-bold rounded-lg hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon
                    name={gonderiliyor ? 'Loader2' : 'Send'}
                    size={12}
                    className={gonderiliyor ? 'animate-spin' : ''}
                  />
                  {gonderiliyor ? 'Gönderiliyor' : yayinda ? 'Yayınla' : 'Taslak Kaydet'}
                </button>
              </div>
            </form>
          </section>

          {/* Mevcut bildirimler */}
          <section>
            <h2 className="font-display text-lg font-bold mb-4">Geçmiş Bildirimler</h2>
            {yukleniyor ? (
              <div className="text-sm text-ink-quiet">Yükleniyor…</div>
            ) : list.length === 0 ? (
              <div className="text-sm text-ink-quiet">
                Henüz bildirim yok.
              </div>
            ) : (
              <div className="space-y-2">
                {list.map((b) => (
                  <div
                    key={b.id}
                    className={`flex items-start gap-3 p-4 bg-surface border border-line rounded-xl ${
 !b.yayinda ? 'opacity-60' : ''
 }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] tracking-wider uppercase font-mono font-bold text-ink-mute">
                          {TIP_LABEL[b.tip]}
                        </span>
                        {!b.yayinda && (
                          <span className="text-[10px] tracking-wider uppercase font-mono font-bold text-premium-deep bg-premium-soft px-1.5 py-0.5 rounded">
                            Taslak
                          </span>
                        )}
                        <span className="text-[10px] text-ink-quiet font-mono ml-auto">
                          {new Date(b.created_at).toLocaleString('tr-TR')}
                        </span>
                      </div>
                      <div className="font-bold text-[14px] mb-1">{b.baslik}</div>
                      <div className="text-[13px] text-ink-soft leading-snug whitespace-pre-wrap">
                        {b.metin}
                      </div>
                      {b.link && (
                        <div className="text-[11px] text-brand dark:text-brand-mute mt-1 font-mono">
                          → {b.link}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => yayinDegistir(b)}
                        title={b.yayinda ? 'Yayından kaldır' : 'Yayınla'}
                        className="p-2 hover:bg-surface-2 rounded-lg transition"
                      >
                        <Icon name={b.yayinda ? 'EyeOff' : 'Eye'} size={14} />
                      </button>
                      <button
                        onClick={() => sil(b.id)}
                        title="Sil"
                        className="p-2 hover:bg-danger-soft text-danger dark:text-danger rounded-lg transition"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};
