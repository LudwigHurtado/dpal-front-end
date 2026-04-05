import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/material-web-theme.css';
import './styles/dpal-theme.css';
import './styles/material-palettes.css';
import './styles/mobile-theme.css';
import { initMaterialPaletteFromStorage } from './utils/materialPalette';
import AppBootstrap from './AppBootstrap';

initMaterialPaletteFromStorage();
import { LanguageProvider } from './i18n';
import { DPALFlowProvider } from './context/DPALFlowContext';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import DevicePreviewFrame from './components/DevicePreviewFrame';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AppErrorBoundary>
        <LanguageProvider>
          <DPALFlowProvider>
            <DevicePreviewFrame>
              <AppBootstrap />
            </DevicePreviewFrame>
          </DPALFlowProvider>
        </LanguageProvider>
      </AppErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);