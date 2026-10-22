import styled from 'styled-components';
export const Navigation = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  margin-bottom: 28px;
  a {
    text-underline-offset: 5px;
  }
  a[aria-current='page'] {
    font-weight: 750;
  }
`;
export const Panel = styled.section`
  padding: 28px;
  border: 1px solid #dbe2ee;
  border-radius: 18px;
  background: #fff;
  overflow-wrap: anywhere;
  @media (max-width: 480px) {
    padding: 22px 16px;
  }
`;
export const Stats = styled.dl`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
  gap: 24px;
  margin: 28px 0;
  dt {
    color: #53617b;
    font-size: 14px;
    margin-bottom: 8px;
  }
  dd {
    margin: 0;
    font-weight: 750;
    font-size: 22px;
  }
`;
export const Deck = styled.ul`
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 16px;
  li {
    display: grid;
    align-content: start;
    justify-items: center;
    gap: 10px;
    text-align: center;
  }
  img {
    object-fit: contain;
  }
`;
export const ChestList = styled.ol`
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 16px;
  li {
    border: 1px solid #dbe2ee;
    border-radius: 12px;
    padding: 20px;
  }
  strong {
    display: block;
    margin-bottom: 12px;
  }
`;
export const Button = styled.button`
  min-height: 44px;
  padding: 10px 18px;
  margin: 12px 0;
  background: #253d74;
  color: white;
  border: 0;
  border-radius: 9px;
  font-weight: 650;
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

export const EmblemGrid = styled.ul`
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr));
  gap: 18px;
  margin-top: 24px;
  li {
    padding: 20px;
    border: 1px solid #dbe2ee;
    border-radius: 16px;
    background: white;
    text-align: center;
  }
  img {
    object-fit: contain;
  }
  h2 {
    font-size: 18px;
  }
`;
