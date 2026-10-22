import styled from 'styled-components';

export const Card = styled.section`
  max-width: 480px;
  margin: 0 auto;
  background: white;
  border: 1px solid #dfe5f0;
  border-radius: 18px;
  padding: 32px;
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
    border: 1px solid #a9b6cf;
    border-radius: 8px;
    padding: 10px 12px;
    background: #fff;
    color: #17284e;
  }
  input[aria-invalid='true'] {
    border-color: #ac2323;
  }
  small {
    font-size: 13px;
    color: #53617b;
  }
`;
export const Button = styled.button`
  min-height: 46px;
  padding: 12px 20px;
  border: 0;
  border-radius: 9px;
  color: white;
  background: #253d74;
  font-weight: 650;
  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;
export const GoogleButton = styled(Button)`
  width: 100%;
  color: #253d74;
  background: white;
  border: 1px solid #a9b6cf;
`;
export const ErrorText = styled.p`
  color: #ac2323;
  font-size: 14px;
  margin: 0;
`;
export const DefinitionList = styled.dl`
  display: grid;
  gap: 8px;
  dt {
    font-size: 13px;
    color: #53617b;
  }
  dd {
    margin: 0 0 14px;
    overflow-wrap: anywhere;
    font-weight: 600;
  }
`;
