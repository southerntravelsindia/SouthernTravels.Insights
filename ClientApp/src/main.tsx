// Entry of the standalone INS-01 app (index.html). A missing build setting stops here with a clear message.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { config, ConfigError } from './app/config';
import './styles/index.css';

const root = createRoot(document.getElementById('root')!);
try {
  config();
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (e) {
  root.render(<p role="alert">{e instanceof ConfigError ? e.message : 'The app could not start.'}</p>);
}
