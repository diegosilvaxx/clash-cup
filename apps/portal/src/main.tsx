import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PageLayout, shellUrl } from '@clash-cup/ui';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PageLayout>
        <App shellOrigin={shellUrl()} />
      </PageLayout>
    </BrowserRouter>
  </StrictMode>,
);
