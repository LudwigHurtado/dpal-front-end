import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { GW_PATHS } from '../../routes/paths';
import { useGwLang } from '../../i18n/useGwLang';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!token.trim()) { setError(t('resetPasswordTokenRequired')); return; }
    if (newPassword.length < 8) { setError(t('resetPasswordTooShort')); return; }
    if (newPassword !== confirmPassword) { setError(t('resetPasswordMismatch')); return; }
    setSubmitting(true);
    try {
      await resetPassword(token.trim(), newPassword);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('resetPasswordError'));
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
        <h1 className="gw-h2" style={{ marginBottom: 4 }}>{t('resetPasswordTitle')}</h1>

        {!done ? (
          <div className="gw-form">
            <p className="gw-muted" style={{ marginBottom: 16, fontSize: 14, lineHeight: 1.5 }}>
              {t('resetPasswordSubtitle')}
            </p>
            <label className="gw-label">
              {t('resetPasswordTokenLabel')}
              <input
                className="gw-input"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={t('resetPasswordTokenPlaceholder')}
                autoComplete="off"
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
            </label>
            <label className="gw-label">
              {t('resetPasswordNewLabel')}
              <input
                className="gw-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label className="gw-label">
              {t('signUpConfirmPassword')}
              <input
                className="gw-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            {error && <div className="gw-error">{error}</div>}
            <button
              type="button"
              className="gw-button gw-button-primary w-full"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? t('loading') : t('resetPasswordCta')}
            </button>
            <div className="gw-muted text-sm" style={{ marginTop: 14 }}>
              <Link to={GW_PATHS.auth.forgotPassword} className="gw-link">{t('resetPasswordRequestNew')}</Link>
              {' · '}
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
                marginBottom: 20,
              }}
            >
              <p style={{ color: '#86efac', fontWeight: 600, marginBottom: 4 }}>{t('resetPasswordSuccessTitle')}</p>
              <p className="gw-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                {t('resetPasswordSuccessBody')}
              </p>
            </div>
            <button
              type="button"
              className="gw-button gw-button-primary w-full"
              onClick={() => navigate(GW_PATHS.auth.signIn)}
            >
              {t('signInCta')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
