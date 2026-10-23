import styled from 'styled-components';
import { buttonStyle } from '@clash-cup/ui';

export const Navigation = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 28px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--cup-border);
  a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    text-decoration: none;
    color: #8fcaff;
  }
  a {
    text-underline-offset: 5px;
  }
`;
export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 400px));
  gap: 20px;
  align-items: stretch;
`;
export const Card = styled.article`
  border: 1px solid var(--cup-border);
  border-radius: 16px;
  padding: 24px;
  background: var(--cup-panel);
  overflow-wrap: anywhere;
  h2 {
    font-size: 22px;
  }
  p {
    white-space: pre-wrap;
  }
`;
export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin: 24px 0;
`;
export const Button = styled.button`
  ${buttonStyle}
`;
export const Feedback = styled.p`
  padding: 16px;
  border: 1px solid var(--cup-border);
  border-radius: 10px;
  background: var(--cup-panel);
`;
