import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { RouteAccessibility } from './RouteAccessibility';
import { Brand, Footer, Frame, GlobalStyle, Header, HeaderContent, Main, SkipLink } from './styles';

function PublicLink({ origin, to, children }: { origin: string; to: string; children: ReactNode }) {
  return origin ? (
    <a href={new URL(to, origin).href}>{children}</a>
  ) : (
    <NavLink to={to} end>
      {children}
    </NavLink>
  );
}

export function PageLayout({
  children,
  accountMenu,
  competitionNavigation = false,
  adminNavigation = false,
  playerNavigation = false,
  publicOrigin = '',
}: {
  children: ReactNode;
  accountMenu?: ReactNode;
  competitionNavigation?: boolean;
  adminNavigation?: boolean;
  playerNavigation?: boolean;
  publicOrigin?: string;
}) {
  return (
    <Frame>
      <GlobalStyle />
      <RouteAccessibility />
      <SkipLink href="#conteudo">Pular para o conteúdo</SkipLink>
      <Header>
        <HeaderContent>
          <Brand to={publicOrigin || '/'} aria-label="Clash Cup — início">
            CLASH <span>CUP</span>
          </Brand>
          <nav aria-label="Navegação principal">
            <PublicLink origin={publicOrigin} to="/">
              Início
            </PublicLink>
            <PublicLink origin={publicOrigin} to="/sobre">
              Sobre
            </PublicLink>
            {competitionNavigation && (
              <>
                <NavLink to="/torneios">Torneios</NavLink>
                <NavLink to="/ranking">Ranking</NavLink>
                <NavLink to="/meus-torneios">Meus torneios</NavLink>
              </>
            )}
            {playerNavigation && <NavLink to="/perfil">Área do jogador</NavLink>}
            {adminNavigation && <NavLink to="/admin">Administração</NavLink>}
            {accountMenu}
          </nav>
        </HeaderContent>
      </Header>
      <Main id="conteudo" tabIndex={-1}>
        {children}
      </Main>
      <Footer>
        <nav aria-label="Informações da comunidade">
          <PublicLink origin={publicOrigin} to="/regras">
            Regras e dúvidas
          </PublicLink>
          <PublicLink origin={publicOrigin} to="/contato">
            Contato
          </PublicLink>
          <PublicLink origin={publicOrigin} to="/apoiadores">
            Apoiadores
          </PublicLink>
          <PublicLink origin={publicOrigin} to="/politicas">
            Dados e privacidade
          </PublicLink>
        </nav>
        <p>Clash Cup Brasil · Uma comunidade para quem gosta de competir.</p>
      </Footer>
    </Frame>
  );
}
