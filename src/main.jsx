import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App.jsx'
import './styles.css'

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('✅ Service Worker registrado com sucesso:', registration.scope);
      })
      .catch(error => {
        console.log('❌ Falha ao registrar Service Worker:', error);
      });
  });
}

// Detectar se o app foi instalado como PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('📱 App pode ser instalado!');
  
  // Você pode mostrar um botão de instalação aqui
  // Ex: document.getElementById('install-button').style.display = 'block';
});

// Detectar quando o app foi instalado
window.addEventListener('appinstalled', () => {
  console.log('🎉 App instalado com sucesso!');
  deferredPrompt = null;
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
