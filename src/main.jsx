import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/app.css';

/* Punto de entrada de la aplicación React.
   createRoot hidrata el contenedor <div id="root"> del index.html.
   StrictMode activa advertencias en desarrollo para detectar
   efectos secundarios y problemas de ciclo de vida. */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
