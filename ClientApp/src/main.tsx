// Entry of the INS-01 bundle (wwwroot/app/ins01.js), mounted by Views/TicketServiceStatus/IndexReact.cshtml.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ROOT_ID } from './app/config';
import './styles/index.css';

const el = document.getElementById(ROOT_ID);
if (el) {
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
