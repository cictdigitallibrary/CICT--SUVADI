import { useCallback, useEffect, useState } from 'react';
import { Globe, MapPin, CalendarDays, RefreshCw, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { flagEmoji } from '../utils/visitor';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const MAROON = '#5C1A08';
const GOLD = '#C9973B';

/**
 * Where the website's visitors come from: top countries, top cities and today's
 * locations. Aggregate counts only (GET /api/analytics/location-stats).
 */
const VisitorLocationPanel = () => {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState('countries');

  // Fetched when the popup opens and on every Refresh / Try again (reloadKey)
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let ignore = false; // the popup was closed or refreshed again meanwhile
    fetch(`${API}/api/analytics/location-stats`, { cache: 'no-store' })
      .then(res => { if (!res.ok) throw new Error(String(res.status)); return res.json(); })
      .then(json => { if (!ignore) { setData(json); setError(false); } })
      .catch(() => { if (!ignore) setError(true); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [reloadKey]);
  const load = useCallback(() => { setLoading(true); setError(false); setReloadKey(k => k + 1); }, []);

  const rows = tab === 'countries' ? (data?.countries ?? [])
    : tab === 'cities' ? (data?.cities ?? [])
    : (data?.today?.cities ?? []);
  const max = rows.reduce((m, r) => Math.max(m, r.count), 1);
  const place = r => [r.city, r.region, r.country].filter(Boolean).join(', ');

  const TABS = [
    { id: 'countries', icon: Globe, label: t('நாடுகள்', 'Countries') },
    { id: 'cities', icon: MapPin, label: t('நகரங்கள்', 'Cities') },
    { id: 'today', icon: CalendarDays, label: t('இன்று', 'Today') },
  ];

  return (
    <div className="vlp">
      {/* Header */}
      <div className="vlp-head">
        <h2 className="vlp-title">
          <Globe size={20} aria-hidden="true" style={{ color: GOLD }} />
          {t('பார்வையாளர் இருப்பிடங்கள்', 'Visitor Locations')}
        </h2>
        <button type="button" className="vlp-refresh" onClick={load} disabled={loading}
          aria-label={t('புதுப்பி', 'Refresh')} title={t('புதுப்பி', 'Refresh')}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="vlp-tabs" role="tablist">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id}
            className={`vlp-tab${tab === id ? ' is-active' : ''}`} onClick={() => setTab(id)}>
            <Icon size={13} aria-hidden="true" />{label}
          </button>
        ))}
      </div>

      {tab === 'today' && data?.today && !loading && !error && (
        <p className="vlp-note">
          {t(
            `இன்றைய ${data.today.totalVisitors.toLocaleString()} பார்வையாளர்களில் ${data.today.locatedVisitors.toLocaleString()} பேரின் இருப்பிடம் அறியப்பட்டுள்ளது`,
            `${data.today.locatedVisitors.toLocaleString()} of ${data.today.totalVisitors.toLocaleString()} visitors today with a known location`
          )}
        </p>
      )}

      {/* Content */}
      {loading ? (
        <div className="vlp-state">{t('இருப்பிடத் தரவு ஏற்றப்படுகிறது…', 'Loading location data…')}</div>
      ) : error ? (
        <div className="vlp-state">
          {t('இருப்பிடத் தரவைப் பெற முடியவில்லை.', 'Could not load location data.')}
          <button type="button" className="vlp-retry" onClick={load}>{t('மீண்டும் முயல்க', 'Try again')}</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="vlp-state">
          <Globe size={26} aria-hidden="true" style={{ opacity: 0.35, margin: '0 auto 0.4rem', display: 'block' }} />
          {t('இன்னும் இருப்பிடத் தரவு இல்லை.', 'No location data yet.')}
        </div>
      ) : (
        <ul className="vlp-list">
          {rows.map((r, i) => {
            const label = tab === 'countries' ? `${flagEmoji(r.countryCode)} ${r.country}`
              : tab === 'cities' ? place(r)
              : `${flagEmoji(r.countryCode)} ${place(r)}`;
            const bar = i === 0 ? `linear-gradient(90deg, ${MAROON}, ${GOLD})`
              : i === 1 ? `linear-gradient(90deg, ${GOLD}, #E8C88A)`
              : '#C8BFB4';
            return (
              <li key={`${tab}-${i}`}>
                <div className="vlp-row">
                  <span className="vlp-label">{label}</span>
                  <span className="vlp-count"><Users size={12} aria-hidden="true" />{r.count.toLocaleString()}</span>
                </div>
                <div className="vlp-track" aria-hidden="true">
                  <div className="vlp-bar" style={{ width: `${Math.min(100, Math.round((r.count / max) * 100))}%`, background: bar }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <style>{`
        .vlp { color: #2A0E00; }
        .vlp-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; padding-right: 2.25rem; }
        .vlp-title { display: flex; align-items: center; gap: 0.55rem; margin: 0; font-family: "Cinzel", serif; font-size: 1.1rem; font-weight: 700; color: ${MAROON}; }
        .vlp-refresh { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; border: 1px solid rgba(201,151,59,0.4); background: #fff; color: ${MAROON}; cursor: pointer; flex-shrink: 0; }
        .vlp-refresh:hover:not(:disabled) { background: rgba(201,151,59,0.12); }
        .vlp-refresh:disabled { cursor: progress; }
        .vlp-tabs { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.9rem; }
        .vlp-tab { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.95rem; border-radius: 999px; border: 1px solid rgba(92,26,8,0.2); background: #fff; color: rgba(42,14,0,0.7); font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .vlp-tab:hover { border-color: ${GOLD}; }
        .vlp-tab.is-active { background: ${MAROON}; border-color: ${MAROON}; color: #FAF8F2; }
        .vlp-tab:focus-visible, .vlp-refresh:focus-visible, .vlp-retry:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 2px; }
        .vlp-note { margin: 0 0 0.75rem; font-size: 0.78rem; color: rgba(42,14,0,0.65); }
        .vlp-state { text-align: center; padding: 2rem 1rem; font-size: 0.88rem; color: rgba(42,14,0,0.55); background: rgba(201,151,59,0.06); border-radius: 10px; }
        .vlp-retry { display: block; margin: 0.75rem auto 0; padding: 0.4rem 1rem; border-radius: 6px; border: 1px solid ${MAROON}; background: ${MAROON}; color: #FAF8F2; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
        .vlp-list { list-style: none; margin: 0; padding: 0 0.35rem 0 0; max-height: 260px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.7rem; }
        .vlp-row { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; margin-bottom: 0.3rem; }
        .vlp-label { font-size: 0.86rem; font-weight: 500; color: #2A0E00; overflow-wrap: anywhere; }
        .vlp-count { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; font-weight: 700; color: ${MAROON}; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .vlp-track { height: 6px; border-radius: 4px; background: rgba(92,26,8,0.08); overflow: hidden; }
        .vlp-bar { height: 100%; border-radius: 4px; transition: width 0.4s ease; }
      `}</style>
    </div>
  );
};

export default VisitorLocationPanel;
