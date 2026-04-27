import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AmbientBackground from './components/AmbientBackground';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AmbientBackground />
    <App />
  </React.StrictMode>,
);
