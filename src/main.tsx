import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { initAI } from './services/aiAgentService';

// Initialize AI Agent if configured
const aiProvider = import.meta.env.VITE_AI_PROVIDER;
const aiApiKey = import.meta.env.VITE_AI_API_KEY;
if (aiProvider && aiApiKey) {
  initAI({
    provider: aiProvider as any,
    apiKey: aiApiKey,
    model: import.meta.env.VITE_AI_MODEL,
    baseUrl: import.meta.env.VITE_AI_BASE_URL,
  });
}

// Register PWA service worker with auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available, please refresh.');
  },
  onOfflineReady() {
    console.log('App ready to work offline.');
  },
});

createRoot(document.getElementById('root')!).render(
  <App />
);
