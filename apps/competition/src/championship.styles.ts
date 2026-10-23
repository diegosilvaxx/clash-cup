import styled from 'styled-components';
import { surface } from '@clash-cup/ui';

export const Editor = styled.form`
  ${surface}
  padding: 24px;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 28px;
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  legend {
    font-size: 1.2rem;
    font-weight: 700;
    margin-bottom: 20px;
  }
  label {
    display: grid;
    gap: 8px;
    margin-bottom: 18px;
    font-size: 0.9rem;
  }
  input,
  textarea,
  select {
    min-height: 44px;
    width: 100%;
    min-width: 0;
    border: 1px solid #476185;
    border-radius: 8px;
    padding: 10px 12px;
    color: var(--cup-text);
    background: #0a172b;
  }
  textarea {
    resize: vertical;
  }
  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .check input {
    width: 20px;
    min-height: 20px;
  }
  .cover {
    width: 100%;
    height: 160px;
    object-fit: cover;
    border-radius: 10px;
    margin-bottom: 14px;
  }
  .players {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 12px;
  }
  .footer {
    grid-column: 1 / -1;
    border-top: 1px solid var(--cup-border);
    padding-top: 20px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: flex-end;
  }
  small {
    color: var(--cup-muted);
    line-height: 1.5;
  }
  @media (max-width: 800px) {
    grid-template-columns: 1fr;
    padding: 18px;
  }
  @media (max-width: 400px) {
    .players,
    .pair {
      grid-template-columns: 1fr;
    }
  }
`;
export const Banner = styled.section`
  ${surface}
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: 40px 28px;
  margin: 24px 0;
  > img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: -2;
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, #081326f5, #081326a6);
    z-index: -1;
  }
  h1 {
    max-width: 800px;
    color: var(--cup-gold);
  }
  p {
    color: #d4e2f6;
    margin-bottom: 0;
    white-space: pre-wrap;
  }
`;
export const Board = styled.section`
  ${surface}
  padding: 20px;
  .rounds {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 20px;
  }
  .rounds button[aria-pressed='true'] {
    border-color: var(--cup-gold);
    color: var(--cup-gold);
  }
  .scroll {
    overflow-x: auto;
    padding-bottom: 12px;
  }
  .bracket {
    display: flex;
    gap: 32px;
    align-items: stretch;
  }
  .round {
    min-width: 220px;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .round h2 {
    font-size: 0.95rem;
    color: var(--cup-muted);
    text-align: center;
    min-height: 24px;
  }
  .matches {
    display: grid;
    flex: 1;
    grid-auto-rows: 1fr;
  }
  .branch {
    display: flex;
    align-items: center;
    position: relative;
    padding: 8px 0;
  }
  .branch > article {
    width: 100%;
  }
  @media (min-width: 701px) {
    .branch[data-outgoing='true']::after {
      content: '';
      position: absolute;
      left: 100%;
      top: 50%;
      width: 16px;
      height: 1px;
      background: #40658d;
    }
    .branch[data-outgoing='true']::before {
      content: '';
      position: absolute;
      left: calc(100% + 16px);
      width: 1px;
      height: 50%;
      background: #40658d;
    }
    .branch[data-outgoing='true']:nth-child(odd)::before {
      top: 50%;
    }
    .branch[data-outgoing='true']:nth-child(even)::before {
      bottom: 50%;
    }
    .round + .round .branch > article::before {
      content: '';
      position: absolute;
      left: -17px;
      top: 50%;
      width: 16px;
      height: 1px;
      background: #40658d;
    }
  }
  .mobile-round {
    display: none;
  }
  @media (max-width: 700px) {
    padding: 16px;
    .scroll {
      overflow-x: visible;
    }
    .round {
      display: none;
      min-width: 0;
    }
    .round[data-selected='true'] {
      display: flex;
    }
    .mobile-round {
      display: block;
      color: var(--cup-muted);
      font-size: 0.85rem;
    }
  }
`;
export const Match = styled.article`
  position: relative;
  border: 1px solid #355578;
  border-radius: 10px;
  background: #0b192c;
  padding: 10px;
  .player {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 4px;
    min-height: 34px;
    font-size: 0.85rem;
  }
  .winner {
    color: var(--cup-gold);
    font-weight: 750;
  }
  .player + .player {
    border-top: 1px solid var(--cup-border);
  }
  .player span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  form {
    border-top: 1px solid var(--cup-border);
    padding-top: 10px;
  }
  .score-inputs {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }
  input {
    width: 52px;
    min-height: 44px;
    border: 1px solid #476185;
    border-radius: 6px;
    background: #142942;
    color: white;
    padding: 6px;
  }
  button {
    font-size: 0.75rem;
    padding: 8px 12px;
    width: 100%;
  }
`;
export const Champion = styled.div`
  margin: 24px auto 0;
  max-width: 480px;
  padding: 24px;
  text-align: center;
  background: radial-gradient(ellipse at top, #9a6c2238, transparent), #101e34;
  border: 1px solid #a67d31;
  border-radius: 12px;
  strong {
    display: block;
    color: var(--cup-gold);
    font-size: 1.6rem;
    margin: 12px 0;
  }
`;
