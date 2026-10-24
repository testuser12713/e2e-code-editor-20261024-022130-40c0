import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { bootstrap } from './app/bootstrap';
import './styles/theme.css';
import './ui/kit.css';

bootstrap();

const container = document.getElementById('root');
if (!container) {
  throw new Error('The application root element is missing.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
