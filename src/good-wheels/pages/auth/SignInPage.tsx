import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { GW_PATHS } from '../../routes/paths';
import { useGwLang } from '../../i18n/useGwLang';

const TEST_PASSENGER_EMAIL = 'passenger@goodwheels.test';
const TEST_PASSENGER_PASSWORD = 'GoodWheels123!';
const TEST_DRIVER_EMAIL = 'driver@goodwheels.test';
const TEST_DRIVER_PASSWORD = 'GoodWheels123!';

const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const showTestHelpers = Boolean(import.meta.env.DEV);

  const afterSignInNavigate = () => {
    const u = useAuthStore.getState().user;
    if (useAuthStore.getState().status !== 'signed_in' || !u) return;
    if (u.role === 'driver') navigate(GW_PATHS.driver.dashboard);
    else if (u.role === 'worker') navigate(GW_PATHS.worker.dashboard);
    else navigate(GW_PATHS.passenger.dashboard);
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
        <h1 className="gw-h2" style={{ marginBottom: 4 }}>
          {t('loginTitle')}
        </h1>
        <p className="gw-muted" style={{ marginBottom: 16, fontSize: 14, lineHeight: 1.45 }}>
          {t('goodWheelsSubtitle')}
        </p>
        <div className="gw-form">
          <p className="gw-muted" style={{ fontSize: 12, marginBottom: 10 }}>
            {t('passengerLoginHint')} · {t('driverLoginHint')}
          </p>
          <label className="gw-label">
            {t('emailLabel')}
            <input className="gw-input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label className="gw-label">
            {t('passwordLabel')}
            <input className="gw-input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" />
          </label>
          <p className="gw-muted" style={{ fontSize: 11, marginTop: -4, marginBottom: 8 }}>
            {t('roleHintAfterFields')}
          </p>
          {error && <div className="gw-error">{error}</div>}
          <button
            type="button"
            className="gw-button gw-button-primary w-full"
            disabled={status === 'loading'}
            onClick={() =>
              void signIn(email, password).then(() => {
                afterSignInNavigate();
              })
            }
          >
            {t('signInCta')}
          </button>
          {showTestHelpers && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="gw-button gw-button-secondary w-full"
                disabled={status === 'loading'}
                onClick={() => {
                  setEmail(TEST_PASSENGER_EMAIL);
                  setPassword(TEST_PASSENGER_PASSWORD);
                }}
              >
                {t('usePassengerTestLogin')}
              </button>
              <button
                type="button"
                className="gw-button gw-button-secondary w-full"
                disabled={status === 'loading'}
                onClick={() => {
                  setEmail(TEST_DRIVER_EMAIL);
                  setPassword(TEST_DRIVER_PASSWORD);
                }}
              >
                {t('useDriverTestLogin')}
              </button>
            </div>
          )}
          <div className="gw-muted text-sm" style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>{t('signInForgotPassword')} <Link to={GW_PATHS.auth.forgotPassword} className="gw-link">{t('signInResetCta')}</Link></span>
            <span>{t('signInNewHere')} <Link to={GW_PATHS.auth.signUp} className="gw-link">{t('signUpCreateAccount')}</Link></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
