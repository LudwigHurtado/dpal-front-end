import React from 'react';

const LayoutV1: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="dpal-bg-root dpal-text-primary min-h-full">{children}</div>;
};

export default LayoutV1;
