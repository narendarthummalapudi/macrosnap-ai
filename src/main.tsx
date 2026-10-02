import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import './index.css';

// PROTECT MAIN WINDOW: Prevent Firebase Auth OAuth bug from closing the main application.
// Firebase SDK sometimes calls window.close() if it mistakenly thinks the main tab is a redirect/popup handler.
// Since the real Firebase popup loads `/__auth/handler` directly (which never executes this file),
// it is 100% safe to completely disable window.close() here in the React entry point.
const originalWindowClose = window.close;
window.close = function () {
    console.warn("Blocked an attempt by a third-party SDK to close the main MacroSnap application window.");
    // We intentionally do NOT call originalWindowClose here, ensuring the main tab stays open!
};

createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
