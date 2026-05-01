import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { GW_PATHS } from '../../routes/paths';
import { useGwLang } from '../../i18n/useGwLang';

type Step = 'role' | 'info' | 'vehicle';

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const t = useGwLang((s) => s.t);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const signUp = useAuthStore((s) => s.signUp);

  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [vehicleMakeModel, setVehicleMakeModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleType, setVehicleType] = useState<'car' | 'moto' | 'truck' | 'van'>('car');
  const [vehicleSeats, setVehicleSeats] = useState(4);
  const [localError, setLocalError] = useState('');

  const displayError = localError || error;

  const handleInfoNext = () => {
    setLocalError('');
    if (!fullName.trim()) { setLocalError('Full name is required.'); return; }
    if (!email.trim() || !email.includes('@')) { setLocalError('A valid email is required.'); return; }
    if (password.length < 8) { setLocalError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setLocalError('Passwords do not match.'); return; }
    if (role === 'driver') { setStep('vehicle'); return; }
    void handleSubmit();
  };

  const handleSubmit = async () => {
    setLocalError('');
    try {
      await signUp({
        email,
        password,
        fullName,
        phone: phone || undefined,
        role,
        vehicleMakeModel: vehicleMakeModel || undefined,
        vehiclePlate: vehiclePlate || undefined,
        vehicleColor: vehicleColor || undefined,
        vehicleType,
        vehicleSeats,
      });
      const u = useAuthStore.getState().user;
      if (useAuthStore.getState().status === 'signed_in' && u) {
        if (u.role === 'driver') navigate(GW_PATHS.driver.dashboard);
        else navigate(GW_PATHS.passenger.dashboard);
      }
    } catch {
      // error displayed from store
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
          maxWidth: 440,
          width: '100%',
          margin: 'auto',
          border: '1px solid rgba(148,163,184,0.25)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
        }}
      >
        <h1 className="gw-h2" style={{ marginBottom: 4 }}>{t('signUpTitle')}</h1>
        <p className="gw-muted" style={{ marginBottom: 20, fontSize: 14, lineHeight: 1.45 }}>
          {t('goodWheelsSubtitle')}
        </p>

        {/* Step 1 — choose role */}
        {step === 'role' && (
          <div className="gw-form">
            <p className="gw-label" style={{ marginBottom: 12 }}>{t('signUpChooseRole')}</p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {(['passenger', 'driver'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  style={{
                    flex: 1,
                    padding: '14px 8px',
                    borderRadius: 10,
                    border: `2px solid ${role === r ? '#22c55e' : 'rgba(148,163,184,0.25)'}`,
                    background: role === r ? 'rgba(34,197,94,0.12)' : 'rgba(30,41,59,0.6)',
                    color: role === r ? '#86efac' : '#94a3b8',
                    fontWeight: role === r ? 700 : 400,
                    fontSize: 15,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {r === 'passenger' ? '🚗 ' + t('roleName_passenger') : '🚙 ' + t('roleName_driver')}
                </button>
              ))}
            </div>
            <p className="gw-muted" style={{ fontSize: 12, marginBottom: 16 }}>
              {role === 'passenger'
                ? t('signUpPassengerHint')
                : t('signUpDriverHint')}
            </p>
            <button
              type="button"
              className="gw-button gw-button-primary w-full"
              onClick={() => { setLocalError(''); setStep('info'); }}
            >
              {t('signUpContinue')}
            </button>
            <div className="gw-muted text-sm" style={{ marginTop: 14 }}>
              {t('signUpAlreadyHaveAccount')} <Link to={GW_PATHS.auth.signIn} className="gw-link">{t('signInCta')}</Link>
            </div>
          </div>
        )}

        {/* Step 2 — account info */}
        {step === 'info' && (
          <div className="gw-form">
            <p className="gw-muted" style={{ fontSize: 12, marginBottom: 12 }}>
              {role === 'passenger' ? '🚗 ' + t('roleName_passenger') : '🚙 ' + t('roleName_driver')} &nbsp;·&nbsp;
              <button type="button" className="gw-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => setStep('role')}>
                {t('signUpChangeRole')}
              </button>
            </p>
            <label className="gw-label">
              {t('signUpFullName')}
              <input className="gw-input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
            </label>
            <label className="gw-label">
              {t('emailLabel')}
              <input className="gw-input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" />
            </label>
            <label className="gw-label">
              {t('signUpPhone')} <span className="gw-muted" style={{ fontWeight: 400 }}>({t('signUpOptional')})</span>
              <input className="gw-input" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" />
            </label>
            <label className="gw-label">
              {t('passwordLabel')}
              <input className="gw-input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="new-password" />
            </label>
            <label className="gw-label">
              {t('signUpConfirmPassword')}
              <input className="gw-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" autoComplete="new-password" />
            </label>
            {displayError && <div className="gw-error">{displayError}</div>}
            <button
              type="button"
              className="gw-button gw-button-primary w-full"
              disabled={status === 'loading'}
              onClick={handleInfoNext}
            >
              {role === 'driver' ? t('signUpNext') : (status === 'loading' ? t('loading') : t('signUpCreateAccount'))}
            </button>
            <button type="button" className="gw-button gw-button-secondary w-full" style={{ marginTop: 8 }} onClick={() => setStep('role')}>
              {t('signUpBack')}
            </button>
          </div>
        )}

        {/* Step 3 — vehicle info (driver only) */}
        {step === 'vehicle' && (
          <div className="gw-form">
            <p className="gw-muted" style={{ fontSize: 12, marginBottom: 12 }}>🚙 {t('roleName_driver')} · {t('signUpVehicleInfo')}</p>
            <label className="gw-label">
              {t('signUpVehicleMakeModel')} <span className="gw-muted" style={{ fontWeight: 400 }}>({t('signUpOptional')})</span>
              <input className="gw-input" placeholder="e.g. Toyota Camry 2022" value={vehicleMakeModel} onChange={(e) => setVehicleMakeModel(e.target.value)} />
            </label>
            <label className="gw-label">
              {t('signUpVehiclePlate')} <span className="gw-muted" style={{ fontWeight: 400 }}>({t('signUpOptional')})</span>
              <input className="gw-input" placeholder="e.g. ABC-1234" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} />
            </label>
            <label className="gw-label">
              {t('signUpVehicleColor')} <span className="gw-muted" style={{ fontWeight: 400 }}>({t('signUpOptional')})</span>
              <input className="gw-input" placeholder="e.g. Silver" value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} />
            </label>
            <label className="gw-label">
              {t('signUpVehicleType')}
              <select className="gw-input" value={vehicleType} onChange={(e) => setVehicleType(e.target.value as typeof vehicleType)}>
                <option value="car">{t('service_car')}</option>
                <option value="moto">{t('service_motorcycle')}</option>
                <option value="truck">Truck</option>
                <option value="van">Van</option>
              </select>
            </label>
            <label className="gw-label">
              {t('signUpVehicleSeats')}
              <input className="gw-input" type="number" min={1} max={15} value={vehicleSeats} onChange={(e) => setVehicleSeats(Number(e.target.value))} />
            </label>
            {displayError && <div className="gw-error">{displayError}</div>}
            <button
              type="button"
              className="gw-button gw-button-primary w-full"
              disabled={status === 'loading'}
              onClick={() => void handleSubmit()}
            >
              {status === 'loading' ? t('loading') : t('signUpCreateAccount')}
            </button>
            <button type="button" className="gw-button gw-button-secondary w-full" style={{ marginTop: 8 }} onClick={() => setStep('info')}>
              {t('signUpBack')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignUpPage;
