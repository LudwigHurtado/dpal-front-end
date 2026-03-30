import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { GW_PATHS } from '../../routes/paths';
import type { Role } from '../../types/role';

const RoleSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const switchRole = useAuthStore((s) => s.switchRole);

  const pick = async (role: Role) => {
    await switchRole(role);
    if (role === 'passenger') navigate(GW_PATHS.passenger.dashboard);
    if (role === 'driver') navigate(GW_PATHS.driver.dashboard);
    if (role === 'worker') navigate(GW_PATHS.worker.dashboard);
  };

  return (
    <div className="space-y-6">
      <h2 className="gw-h2">Choose your role</h2>
      <p className="gw-muted">
        You can switch later. Each role has its own dashboard, navigation, and workflows.
      </p>
      <div className="gw-role-grid">
        <button type="button" className="gw-card gw-role-card" onClick={() => void pick('passenger')}>
          <div className="gw-role-title">Passenger</div>
          <div className="gw-role-sub">Request a ride • Family safe options • Saved places</div>
        </button>
        <button type="button" className="gw-card gw-role-card" onClick={() => void pick('driver')}>
          <div className="gw-role-title">Driver</div>
          <div className="gw-role-sub">Go online • Accept rides • Complete trips</div>
        </button>
        <button type="button" className="gw-card gw-role-card" onClick={() => void pick('worker')}>
          <div className="gw-role-title">Worker</div>
          <div className="gw-role-sub">Dispatch support • Coordinate cases • Track outcomes</div>
        </button>
      </div>
    </div>
  );
};

export default RoleSelectPage;

