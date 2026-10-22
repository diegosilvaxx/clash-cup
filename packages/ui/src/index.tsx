import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Brand, Footer, Frame, GlobalStyle, Header, HeaderContent, Main, SkipLink } from './styles';
export { ActionLink, Container, Notice } from './styles';
export { AccountMenu } from './AccountMenu';

export function PageLayout({
  children,
  accountMenu,
}: {
  children: ReactNode;
  accountMenu?: ReactNode;
}) {
  return (
    <Frame>
      <GlobalStyle />
      <SkipLink href="#conteudo">Pular para o conteúdo</SkipLink>
      <Header>
        <HeaderContent>
          <Brand to="/" aria-label="Clash Cup — início">
            CLASH <span>CUP</span>
          </Brand>
          <nav aria-label="Navegação principal">
            <Link to="/">Início</Link>
            <Link to="/sobre">Sobre</Link>
            {accountMenu}
          </nav>
        </HeaderContent>
      </Header>
      <Main id="conteudo" tabIndex={-1}>
        {children}
      </Main>
      <Footer>
        <p>Clash Cup Brasil · Uma comunidade para quem gosta de competir.</p>
      </Footer>
    </Frame>
  );
}
