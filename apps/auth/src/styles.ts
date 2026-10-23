import styled from 'styled-components';

export const Card = styled.section`
  max-width: 480px;
  margin: 0 auto;
  background: var(--cup-panel);
  border: 1px solid var(--cup-border);
  border-radius: 18px;
  padding: 32px;
  border-top: 3px solid #168dff;
  box-shadow: 0 16px 70px #0004;
  h1 {
    font-size: 30px;
    letter-spacing: -1px;
  }
  @media (max-width: 480px) {
    padding: 24px 18px;
  }
`;
export const Form = styled.form`
  display: grid;
  gap: 20px;
  margin: 24px 0;
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 20px;
    min-width: 0;
  }
`;
export const Field = styled.div`
  display: grid;
  gap: 8px;
  label {
    font-size: 14px;
    font-weight: 650;
  }
  input {
    width: 100%;
    min-height: 46px;
    border: 1px solid #476185;
    border-radius: 8px;
    padding: 10px 12px;
    background: var(--cup-panel);
    color: var(--cup-text);
  }
  input[aria-invalid='true'] {
    border-color: var(--cup-danger);
  }
  small {
    font-size: 13px;
    color: var(--cup-muted);
  }
`;
export const Button = styled.button`
  min-height: 46px;
  padding: 12px 20px;
  border: 0;
  border-radius: 9px;
  color: white;
  background: #1474e4;
  font-weight: 650;
  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;
export const GoogleButton = styled(Button)`
  width: 100%;
  color: var(--cup-text);
  background: var(--cup-panel);
  border: 1px solid #476185;
`;
export const ErrorText = styled.p`
  color: var(--cup-danger);
  font-size: 14px;
  margin: 0;
`;
export const DefinitionList = styled.dl`
  display: grid;
  gap: 8px;
  dt {
    font-size: 13px;
    color: var(--cup-muted);
  }
  dd {
    margin: 0 0 14px;
    overflow-wrap: anywhere;
    font-weight: 600;
  }
`;
