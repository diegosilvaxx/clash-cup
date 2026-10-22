import styled from 'styled-components';
export const Navigation = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  margin-bottom: 28px;
  a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }
  a[aria-current='page'] {
    font-weight: 750;
  }
`;
export const Panel = styled.section`
  background: white;
  border: 1px solid #dbe2ee;
  border-radius: 16px;
  padding: 24px;
  margin: 24px 0;
  overflow-wrap: anywhere;
  select {
    max-width: 100%;
    min-height: 44px;
  }
  @media (max-width: 480px) {
    padding: 16px;
  }
`;
export const Form = styled.form`
  max-width: 720px;
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  label {
    display: grid;
    gap: 8px;
    margin: 18px 0;
  }
  input:not([type='checkbox']),
  select,
  textarea {
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    background: white;
    color: inherit;
    border: 1px solid #aab8cf;
    border-radius: 8px;
  }
  textarea {
    min-height: 110px;
    resize: vertical;
  }
  label:has(input[type='checkbox']) {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  input[type='checkbox'] {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
`;
export const Button = styled.button`
  min-height: 44px;
  padding: 10px 18px;
  border: 0;
  border-radius: 9px;
  background: #253d74;
  color: white;
  font-weight: 650;
  margin: 10px 12px 10px 0;
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;
export const TableFrame = styled.div`
  overflow-x: auto;
  margin: 24px 0;
  table {
    border-collapse: collapse;
    width: 100%;
    text-align: left;
    background: white;
  }
  th,
  td {
    padding: 14px;
    border-bottom: 1px solid #dbe2ee;
  }
  caption {
    text-align: left;
    padding: 14px;
    font-weight: 650;
  }
`;
