import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
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
    <AppErrorBoundary>
      <LanguageProvider>
        <DPALFlowProvider>
          <DevicePreviewFrame>
            <App />
          </DevicePreviewFrame>
        </DPALFlowProvider>
      </LanguageProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);