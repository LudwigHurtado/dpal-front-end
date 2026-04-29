import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { GW_PATHS } from '../../routes/paths';

const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState('passenger@goodwheels.test');
  const [password, setPassword] = useState('GoodWheels123!');

  return (
    <div className="gw-auth">
      <div className="gw-auth-card">
        <h2 className="gw-h2">Sign in</h2>
        <p className="gw-muted">Use test credentials for passenger or driver sign-in.</p>
        <div className="gw-form">
          <label className="gw-label">
            Email
            <input className="gw-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="gw-label">
            Password
            <input className="gw-input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          </label>
          {error && <div className="gw-error">{error}</div>}
          <button
            type="button"
            className="gw-button gw-button-primary w-full"
            disabled={status === 'loading'}
            onClick={() =>
              void signIn(email, password).then(() => {
                if (useAuthStore.getState().status === 'signed_in') {
                  navigate(GW_PATHS.auth.roleSelect);
                }
              })
            }
          >
            Continue
          </button>
          <div className="gw-muted text-sm">
            New here? <Link to={GW_PATHS.auth.signUp} className="gw-link">Create an account</Link>
          </div>
          <div className="gw-muted text-xs">
            Passenger: passenger@goodwheels.test · Driver: driver@goodwheels.test · Password: GoodWheels123!
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;

