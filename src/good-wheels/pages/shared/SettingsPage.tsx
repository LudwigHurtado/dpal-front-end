import React from 'react';
import { useGwLang } from '../../i18n/useGwLang';
import type { GwLang } from '../../i18n/gwTranslations';

const SettingsPage: React.FC = () => {
  const lang = useGwLang((s) => s.lang);
  const setLang = useGwLang((s) => s.setLang);
  const t = useGwLang((s) => s.t);

  return (
    <div className="gw-card p-6">
      <div className="gw-card-title">{t('settingsTitle')}</div>
      <p className="gw-muted mt-2">{t('chooseLanguage')}</p>
      <div className="mt-4 flex items-center gap-2">
        {(['en', 'es', 'pt'] as GwLang[]).map((code) => (
          <button
            key={code}
            type="button"
            className="gw-button gw-button-secondary"
            style={{
              background: lang === code ? '#0ea5e9' : undefined,
              color: lang === code ? '#fff' : undefined,
            }}
            onClick={() => setLang(code)}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SettingsPage;

