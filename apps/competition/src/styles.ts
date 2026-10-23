import styled from 'styled-components';

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
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 290px), 1fr));
  gap: 20px;
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
  min-height: 44px;
  padding: 10px 18px;
  border: 0;
  border-radius: 9px;
  background: #1474e4;
  color: white;
  font-weight: 650;
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;
export const Feedback = styled.p`
  padding: 16px;
  border: 1px solid var(--cup-border);
  border-radius: 10px;
  background: var(--cup-panel);
`;
