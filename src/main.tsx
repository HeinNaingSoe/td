import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ErrorBoundary } from './ErrorBoundary'

// Debug: Check if root exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
  document.body.innerHTML = '<div style="padding: 2rem; color: red; background: white;">Error: Root element not found!</div>';
} else {
  console.log('✅ Root element found, mounting React app...');
  
  // Add a visible test element first
  rootElement.style.cssText = 'min-height: 100vh; background: #0f172a; color: #f1f5f9;';
  
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>,
    );
    console.log('✅ React app mounted successfully');
  } catch (error: any) {
    console.error('❌ Error mounting React app:', error);
    rootElement.innerHTML = `
      <div style="padding: 2rem; color: #ef4444; background: #1e293b; min-height: 100vh; font-family: sans-serif;">
        <h1>Error mounting React app</h1>
        <pre style="background: #0f172a; padding: 1rem; border-radius: 8px; overflow: auto;">${error?.message || error}</pre>
        <pre style="background: #0f172a; padding: 1rem; border-radius: 8px; overflow: auto; margin-top: 1rem;">${error?.stack || ''}</pre>
      </div>
    `;
  }
}
