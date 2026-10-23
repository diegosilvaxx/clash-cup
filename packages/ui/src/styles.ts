import { Link } from 'react-router-dom';
import styled, { createGlobalStyle, css } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  :root {
    color-scheme: dark;
    --cup-bg: #080f1e;
    --cup-panel: #101e34;
    --cup-panel-raised: #152740;
    --cup-border: #283c59;
    --cup-text: #f1f5ff;
    --cup-muted: #afc0da;
    --cup-blue: #0585ff;
    --cup-gold: #ffd166;
    --cup-danger: #ffa0a7;
    font-family: 'Segoe UI', Inter, system-ui, sans-serif;
    color: var(--cup-text);
    background: var(--cup-bg);
    font-synthesis: none;
  }
  * { box-sizing: border-box; }
  body { margin: 0; overflow-wrap: break-word; }
  a { color: inherit; text-underline-offset: 4px; }
  a:hover { color: #7dc7ff; }
  button, input, select, textarea { font: inherit; }
  button { cursor: pointer; }
  button:disabled { cursor: default; }
  img { max-width: 100%; height: auto; }
  svg { flex-shrink: 0; }
  :focus-visible { outline: 3px solid var(--cup-gold); outline-offset: 4px; }
  ::selection { color: white; background: #115bba; }
  h1, h2, h3, p { margin-top: 0; }
  h1, h2, h3 { line-height: 1.15; letter-spacing: -.03em; }
  h1 { font-size: clamp(1.9rem, 3.3vw, 2.75rem); margin-bottom: 16px; }
  h2 { font-size: 1.4rem; }
  p { line-height: 1.7; color: var(--cup-muted); }
  input, select, textarea { accent-color: var(--cup-blue); }
  input::placeholder, textarea::placeholder { color: #8fa4c2; }
  input:disabled, select:disabled, textarea:disabled { opacity: .65; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; animation: none !important; transition: none !important; } }
`;
export const surface = css`
  background: linear-gradient(145deg, #11223c, #0d192d);
  border: 1px solid var(--cup-border);
  border-radius: 16px;
`;
export const buttonStyle = css`
  min-height: 44px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 11px 20px;
  border: 1px solid #299dff;
  border-radius: 9px;
  color: white;
  background: linear-gradient(180deg, #079dff, #0560df);
  box-shadow:
    inset 0 1px 0 #ffffff29,
    0 4px 14px #0054ca22;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 750;
  line-height: 1.35;
  transition:
    filter 0.15s,
    border-color 0.15s;
  &:hover:not(:disabled) {
    color: white;
    filter: brightness(1.15);
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
export const Frame = styled.div`
  min-height: 100dvh;
`;
export const Workspace = styled.div`
  margin-left: 232px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 100dvh;
  @media (max-width: 900px) {
    margin-left: 0;
  }
`;
export const Sidebar = styled.aside<{ $open: boolean }>`
  position: fixed;
  inset: 0 auto 0 0;
  width: 232px;
  z-index: 40;
  display: flex;
  flex-direction: column;
  padding: 26px 14px 18px;
  overflow-y: auto;
  border-right: 1px solid var(--cup-border);
  background:
    repeating-linear-gradient(45deg, transparent 0 35px, #5289de06 35px 36px),
    repeating-linear-gradient(-45deg, transparent 0 35px, #5289de06 35px 36px), #0a162b;
  nav {
    display: grid;
    gap: 5px;
  }
  nav a {
    display: flex;
    align-items: center;
    gap: 13px;
    min-height: 45px;
    padding: 10px 14px;
    border: 1px solid transparent;
    border-radius: 9px;
    font-size: 0.9rem;
    text-decoration: none;
    color: #c7d7ed;
    transition: background 0.15s;
  }
  nav a:hover {
    color: white;
    background: #192f4d;
  }
  nav a[aria-current='page'] {
    background: linear-gradient(100deg, #0563d1, #123968);
    border-color: #258fff;
    color: white;
    font-weight: 700;
    box-shadow: inset 0 0 14px #0080ff22;
  }
  @media (max-width: 900px) {
    width: 264px;
    visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
    transform: translateX(${({ $open }) => ($open ? '0' : '-100%')});
    transition: transform 0.2s;
  }
`;
export const Brand = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  margin: 0 0 28px;
  color: #f5f8ff;
  text-align: center;
  text-decoration: none;
  font-family: Impact, 'Arial Narrow', sans-serif;
  font-weight: 900;
  font-size: 32px;
  letter-spacing: 0.035em;
  line-height: 0.96;
  span {
    display: block;
    color: var(--cup-gold);
  }
  &:hover {
    color: white;
  }
`;
export const NavDivider = styled.div`
  height: 1px;
  background: var(--cup-border);
  margin: 13px 10px;
`;
export const VipPromotion = styled.div`
  margin-top: auto;
  padding-top: 24px;
  a {
    display: grid;
    justify-items: center;
    gap: 9px;
    padding: 18px 12px;
    border: 1px solid #a0772b;
    border-radius: 12px;
    background: radial-gradient(ellipse at top, #86651c50, transparent 70%), #101d31;
    text-align: center;
    text-decoration: none;
  }
  strong {
    font-size: 1.1rem;
    color: var(--cup-gold);
  }
  small {
    color: var(--cup-muted);
    line-height: 1.5;
  }
  span {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    color: var(--cup-gold);
    font-size: 0.8rem;
    font-weight: 750;
  }
`;
export const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid #263b585c;
  background: #0a162bee;
  backdrop-filter: blur(16px);
`;
export const HeaderContent = styled.div`
  min-height: 72px;
  max-width: 1580px;
  margin: auto;
  padding: 10px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  nav {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 0.85rem;
  }
  nav a {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    min-height: 44px;
    text-decoration: none;
  }
  @media (max-width: 600px) {
    padding: 10px 16px;
    gap: 12px;
    nav {
      gap: 10px;
    }
  }
`;
export const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  color: var(--cup-muted);
  font-size: 0.85rem;
  strong {
    color: white;
    font-weight: 650;
  }
  @media (max-width: 600px) {
    .community-label {
      display: none;
    }
  }
`;
export const MobileMenuButton = styled.button`
  display: none;
  background: #152740;
  border: 1px solid var(--cup-border);
  border-radius: 9px;
  color: white;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  @media (max-width: 900px) {
    display: inline-flex;
  }
`;
export const Backdrop = styled.button`
  display: none;
  @media (max-width: 900px) {
    display: block;
    position: fixed;
    inset: 0;
    background: #020814b8;
    border: 0;
    z-index: 35;
  }
`;
export const DrawerClose = styled(MobileMenuButton)`
  align-self: flex-end;
  margin-bottom: 8px;
  flex-shrink: 0;
`;
export const Main = styled.main`
  width: 100%;
  min-width: 0;
  flex: 1;
  &:focus {
    outline: none;
  }
`;
export const Footer = styled.footer`
  margin-top: 32px;
  padding: 26px 24px;
  text-align: center;
  color: var(--cup-muted);
  font-size: 0.75rem;
  border-top: 1px solid #22354f;
  nav {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0 22px;
    margin-bottom: 10px;
  }
  a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    text-decoration: none;
  }
  a[aria-current='page'] {
    font-weight: 750;
    color: var(--cup-gold);
  }
  p {
    margin-bottom: 8px;
  }
  small {
    display: block;
    max-width: 700px;
    margin: auto;
    font-size: 0.7rem;
    line-height: 1.6;
    color: #91a6c3;
  }
`;
export const SkipLink = styled.a`
  position: fixed;
  top: -100px;
  left: 16px;
  padding: 12px 20px;
  background: #ffdb7e;
  color: #0b1a32;
  border-radius: 8px;
  z-index: 60;
  &:focus {
    top: 10px;
    color: #0b1a32;
  }
`;
export const Container = styled.div`
  max-width: 1480px;
  min-width: 0;
  width: 100%;
  margin: 0 auto;
  padding: 36px 28px;
  @media (max-width: 600px) {
    padding: 28px 16px;
  }
`;
export const ActionLink = styled.a`
  ${buttonStyle}
`;
export const Notice = styled.section`
  ${surface} max-width: 680px;
  margin: 64px auto;
  padding: 28px;
  button {
    ${buttonStyle}
  }
  @media (max-width: 700px) {
    margin: 32px 16px;
  }
`;
