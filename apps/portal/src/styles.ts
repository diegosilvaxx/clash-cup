import styled from 'styled-components';
import { Container } from '@clash-cup/ui';

export const ReadingPage = styled(Container)`
  max-width: 960px;
  h1 {
    font-size: clamp(30px, 4vw, 44px);
    letter-spacing: -1px;
  }
  h2 {
    font-size: 24px;
    margin-top: 32px;
  }
  li {
    line-height: 1.7;
    margin: 8px 0;
  }
  a {
    text-underline-offset: 4px;
    overflow-wrap: anywhere;
  }
`;
export const Panel = styled.section`
  background: var(--cup-panel);
  border: 1px solid var(--cup-border);
  border-radius: 16px;
  padding: 24px;
  margin: 24px 0;
  h2 {
    margin-top: 0;
  }
  p:last-child {
    margin-bottom: 0;
  }
  @media (max-width: 480px) {
    padding: 20px;
  }
`;
export const Questions = styled.div`
  details {
    border: 1px solid var(--cup-border);
    background: var(--cup-panel);
    border-radius: 12px;
    margin: 14px 0;
    padding: 0 20px;
  }
  summary {
    padding: 18px 0;
    min-height: 48px;
    cursor: pointer;
    font-weight: 700;
    line-height: 1.5;
  }
  details[open] summary {
    margin-bottom: 4px;
  }
`;
export const SupportersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin: 32px 0;
  article {
    background: var(--cup-panel);
    padding: 24px;
    border: 1px solid var(--cup-border);
    border-radius: 16px;
    text-align: center;
  }
  img {
    width: 160px;
    height: 160px;
    object-fit: contain;
    border-radius: 12px;
  }
  h2 {
    font-size: 20px;
    margin-top: 20px;
  }
  a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;
