import { Link } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  :root { color-scheme: light; font-family: Inter, system-ui, sans-serif; color: #17284e; background: #f6f8fc; font-synthesis: none; }
  * { box-sizing: border-box; }
  body { margin: 0; }
  a { color: inherit; }
  button, input { font: inherit; }
  button { cursor: pointer; }
  img { max-width: 100%; }
  :focus-visible { outline: 3px solid #96700b; outline-offset: 4px; }
  h1, h2, h3, p { margin-top: 0; }
  p { line-height: 1.7; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; animation: none !important; transition: none !important; } }
`;
export const Frame = styled.div`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
`;
export const Header = styled.header`
  background: #fff;
  border-bottom: 1px solid #e0e6f0;
`;
export const HeaderContent = styled.div`
  max-width: 1160px;
  margin: auto;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  nav {
    display: flex;
    gap: 24px;
    font-size: 14px;
  }
  nav a {
    text-decoration: none;
  }
  @media (max-width: 480px) {
    padding: 16px;
    gap: 12px;
    nav {
      gap: 14px;
      font-size: 13px;
    }
  }
`;
export const Brand = styled(Link)`
  font-size: 22px;
  font-weight: 850;
  text-decoration: none;
  letter-spacing: -0.8px;
  span {
    color: #ad5a04;
  }
`;
export const Main = styled.main`
  width: 100%;
  flex: 1;
`;
export const Footer = styled.footer`
  padding: 28px 24px;
  text-align: center;
  color: #53617b;
  font-size: 13px;
  border-top: 1px solid #e0e6f0;
  p {
    margin-bottom: 0;
  }
`;
export const SkipLink = styled.a`
  position: absolute;
  top: -100px;
  left: 16px;
  padding: 12px;
  background: white;
  z-index: 10;
  &:focus {
    top: 10px;
  }
`;
export const Container = styled.div`
  max-width: 1160px;
  margin: 0 auto;
  padding: 48px 24px;
  @media (max-width: 480px) {
    padding: 32px 16px;
  }
`;
export const ActionLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 12px 22px;
  border-radius: 10px;
  background: #f6cc60;
  color: #19284b;
  text-decoration: none;
  font-weight: 750;
  &:hover {
    background: #ffdc86;
  }
`;
export const Notice = styled.section`
  max-width: 680px;
  margin: 64px auto;
  padding: 24px;
  border: 1px solid #dbe2ee;
  border-radius: 14px;
  background: white;
  button {
    min-height: 44px;
    padding: 10px 18px;
    border: 0;
    border-radius: 8px;
    background: #253d74;
    color: white;
  }
`;
