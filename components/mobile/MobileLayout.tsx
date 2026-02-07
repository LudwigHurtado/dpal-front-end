import React from 'react';
import MobileBottomNav, { type MobileTab } from './MobileBottomNav';

const SAFE_TOP = 'env(safe-area-inset-top, 0px)';
const BOTTOM_NAV_HEIGHT = 56;
const SAFE_BOTTOM = 'env(safe-area-inset-bottom, 0px)';

interface MobileLayoutProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  children: React.ReactNode;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  activeTab,
  onTabChange,
  children,
}) => {
  return (
    <div
      className="dpal-mobile-ui min-h-screen flex flex-col bg-zinc-950 text-zinc-100 font-mono"
      style={{ paddingTop: SAFE_TOP }}
    >
      <main
        className="flex-1 overflow-auto pb-0"
        style={{
          paddingBottom: `calc(${BOTTOM_NAV_HEIGHT}px + ${SAFE_BOTTOM})`,
        }}
      >
        {children}
      </main>
      <MobileBottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
};

export default MobileLayout;
