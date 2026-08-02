import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource-variable/archivo/wght.css';
import './styles/global.css';

import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
