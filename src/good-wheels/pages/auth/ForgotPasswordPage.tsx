import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { GW_PATHS } from '../../routes/paths';
import { useGwLang } from '../../i18n/useGwLang';

const ForgotPasswordPage: React.FC = () => {
  const t = useGwLang((s) => s.t);
  const forgotPassword = useAuthStore((s) => s.forgotPassword);

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [resetToken, setResetToken] = useState<string | undefined>(undefined);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !email.includes('@')) {
      setError(t('forgotPasswordEmailRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const result = await forgotPassword(email.trim().toLowerCase());
      setResetToken(result.resetToken);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('forgotPasswordError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="gw-auth"
      style={{
        background: 'linear-gradient(165deg, #0f172a 0%, #1e293b 45%, #14532d 100%)',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        className="gw-auth-card"
        style={{
          maxWidth: 420,
          width: '100%',
          margin: 'auto',
          border: '1px solid rgba(148,163,184,0.25)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
        }}
      >
        <h1 className="gw-h2" style={{ marginBottom: 4 }}>{t('forgotPasswordTitle')}</h1>

        {!done ? (
          <div className="gw-form">
            <p className="gw-muted" style={{ marginBottom: 16, fontSize: 14, lineHeight: 1.5 }}>
              {t('forgotPasswordSubtitle')}
            </p>
            <label className="gw-label">
              {t('emailLabel')}
              <input
                className="gw-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
              />
            </label>
            {error && <div className="gw-error">{error}</div>}
            <button
              type="button"
              className="gw-button gw-button-primary w-full"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? t('loading') : t('forgotPasswordSendCta')}
            </button>
            <div className="gw-muted text-sm" style={{ marginTop: 14 }}>
              <Link to={GW_PATHS.auth.signIn} className="gw-link">{t('forgotPasswordBackToSignIn')}</Link>
            </div>
          </div>
        ) : (
          <div className="gw-form">
            <div
              style={{
                background: 'rgba(34,197,94,0.10)',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 16,
              }}
            >
              <p style={{ color: '#86efac', fontWeight: 600, marginBottom: 4 }}>{t('forgotPasswordSentTitle')}</p>
              <p className="gw-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                {t('forgotPasswordSentBody')}
              </p>
            </div>

            {resetToken && (
              <div
                style={{
                  background: 'rgba(251,191,36,0.10)',
                  border: '1px solid rgba(251,191,36,0.3)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  marginBottom: 16,
                }}
              >
                <p style={{ color: '#fbbf24', fontWeight: 600, marginBottom: 6, fontSize: 12 }}>
                  {t('forgotPasswordDevTokenLabel')}
                </p>
                <code
                  style={{
                    display: 'block',
                    wordBreak: 'break-all',
                    fontSize: 11,
                    color: '#fef3c7',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '8px 10px',
                    borderRadius: 6,
                    userSelect: 'all',
                  }}
                >
                  {resetToken}
                </code>
                <p className="gw-muted" style={{ fontSize: 11, marginTop: 6 }}>
                  {t('forgotPasswordDevTokenNote')}
                </p>
              </div>
            )}

            <Link to={GW_PATHS.auth.resetPassword} className="gw-button gw-button-primary w-full" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
              {t('forgotPasswordGoToReset')}
            </Link>
            <div className="gw-muted text-sm" style={{ marginTop: 14 }}>
              <Link to={GW_PATHS.auth.signIn} className="gw-link">{t('forgotPasswordBackToSignIn')}</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
