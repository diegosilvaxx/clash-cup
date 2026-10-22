import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Standalone } from './Standalone';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Standalone />
    </BrowserRouter>
  </StrictMode>,
);
