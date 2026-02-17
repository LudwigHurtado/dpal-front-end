import React from 'react';

const LayoutV2: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative">
      <div className="pointer-events-none fixed top-3 right-3 z-[120] px-3 py-1 rounded-full border border-cyan-500/40 bg-cyan-950/70 text-[10px] font-black uppercase tracking-widest text-cyan-300">
        Layout V2
      </div>
      {children}
    </div>
  );
};

export default LayoutV2;
