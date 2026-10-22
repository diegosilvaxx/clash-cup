import { safeExternalUrl } from './api';
import { Panel } from './styles';
export function Vip() {
  const support = safeExternalUrl(import.meta.env.VITE_VIP_SUPPORT_URL);
  return (
    <>
      <h1>Área VIP</h1>
      <Panel>
        <h2>Apoie a comunidade</h2>
        <p>Conheça as formas de apoiar a Clash Cup e acompanhar as iniciativas da comunidade.</p>
        {support ? (
          <p>
            <a href={support} target="_blank" rel="noopener noreferrer">
              Conhecer as opções de apoio (nova aba)
            </a>
          </p>
        ) : (
          <p>As informações de apoio serão divulgadas em breve.</p>
        )}
        <p>Consulte no canal de apoio as condições e informações atualizadas.</p>
      </Panel>
    </>
  );
}
