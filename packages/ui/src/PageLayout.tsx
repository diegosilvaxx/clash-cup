import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { RouteAccessibility } from './RouteAccessibility';
import { Crest, Icon, type IconName } from './Icon';
import {
  Backdrop,
  DrawerClose,
  Brand,
  Breadcrumb,
  Footer,
  Frame,
  GlobalStyle,
  Header,
  HeaderContent,
  Main,
  MobileMenuButton,
  NavDivider,
  Sidebar,
  SkipLink,
  VipPromotion,
  Workspace,
} from './styles';

function PublicLink({ origin, to, children }: { origin: string; to: string; children: ReactNode }) {
  return origin ? (
    <a href={new URL(to, origin).href}>{children}</a>
  ) : (
    <NavLink to={to} end>
      {children}
    </NavLink>
  );
}
const sections: Record<string, string> = {
  '': 'Início',
  torneios: 'Torneios',
  ranking: 'Ranking',
  campeonatos: 'Campeonatos',
  'meus-campeonatos': 'Meus campeonatos',
  'meus-torneios': 'Meus torneios',
  perfil: 'Meu perfil',
  baus: 'Próximos baús',
  loja: 'Loja',
  'meus-emblemas': 'Meus emblemas',
  'area-vip': 'Área VIP',
  entrar: 'Entrar',
  cadastro: 'Criar conta',
  'minha-conta': 'Minha conta',
  'vincular-jogador': 'Vincular jogador',
  admin: 'Administração',
  sobre: 'Sobre',
  regras: 'Regras e dúvidas',
  contato: 'Contato',
  apoiadores: 'Apoiadores',
  politicas: 'Privacidade',
};
function MenuLink({ to, icon, children }: { to: string; icon: IconName; children: ReactNode }) {
  return (
    <NavLink to={to}>
      <Icon name={icon} />
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
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const drawer = useRef<HTMLElement>(null);
  const restoreFocus = useRef<'trigger' | 'content' | null>(null);
  function closeMenu(target: 'trigger' | 'content') {
    restoreFocus.current = target;
    setOpen(false);
  }
  useEffect(() => {
    if (!open) {
      if (restoreFocus.current === 'trigger') menuButton.current?.focus();
      if (restoreFocus.current === 'content') document.getElementById('conteudo')?.focus();
      restoreFocus.current = null;
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    navigation.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        restoreFocus.current = 'trigger';
        setOpen(false);
      }
      if (event.key !== 'Tab') return;
      const links = drawer.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)');
      const first = links?.[0];
      const last = links?.[links.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    function resize() {
      if (window.innerWidth > 900) {
        restoreFocus.current = 'content';
        setOpen(false);
      }
    }
    window.addEventListener('keydown', escape);
    window.addEventListener('resize', resize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', escape);
      window.removeEventListener('resize', resize);
    };
  }, [open]);
  return (
    <Frame>
      <GlobalStyle />
      <RouteAccessibility />
      <SkipLink href="#conteudo">Pular para o conteúdo</SkipLink>
      {open && (
        <Backdrop
          aria-label="Fechar menu de navegação"
          tabIndex={-1}
          onClick={() => closeMenu('trigger')}
        />
      )}
      <Sidebar
        $open={open}
        ref={drawer}
        role={open ? 'dialog' : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? 'Menu de navegação' : undefined}
        id="menu-principal"
        onClick={(event) => {
          if (open && (event.target as Element).closest('a')) closeMenu('content');
        }}
      >
        <DrawerClose aria-label="Fechar navegação" onClick={() => closeMenu('trigger')}>
          <Icon name="close" />
        </DrawerClose>
        <Brand to={publicOrigin || '/'} aria-label="Clash Cup — início">
          <Crest />
          <div>
            CLASH<span>CUP</span>
          </div>
        </Brand>
        <nav aria-label="Navegação principal" ref={navigation}>
          <PublicLink origin={publicOrigin} to="/">
            <Icon name="home" />
            Início
          </PublicLink>
          {competitionNavigation && (
            <>
              <MenuLink to="/torneios" icon="trophy">
                Torneios
              </MenuLink>
              <MenuLink to="/ranking" icon="ranking">
                Ranking
              </MenuLink>
              <MenuLink to="/meus-campeonatos" icon="trophy">
                Meus campeonatos
              </MenuLink>
              <MenuLink to="/meus-torneios" icon="calendar">
                Meus torneios
              </MenuLink>
            </>
          )}
          {playerNavigation && (
            <MenuLink to="/loja" icon="shop">
              Loja
            </MenuLink>
          )}
          <NavDivider />
          {playerNavigation && (
            <>
              <MenuLink to="/perfil" icon="user">
                Meu perfil
              </MenuLink>
              <MenuLink to="/baus" icon="chest">
                Próximos baús
              </MenuLink>
              <MenuLink to="/meus-emblemas" icon="shield">
                Meus emblemas
              </MenuLink>
              <MenuLink to="/area-vip" icon="crown">
                Área VIP
              </MenuLink>
            </>
          )}
          <PublicLink origin={publicOrigin} to="/sobre">
            <Icon name="info" />
            Sobre
          </PublicLink>
          {adminNavigation && (
            <>
              <NavDivider />
              <MenuLink to="/admin" icon="shield">
                Administração
              </MenuLink>
            </>
          )}
        </nav>
        {playerNavigation && (
          <VipPromotion>
            <NavLink to="/area-vip">
              <Crest size={45} />
              <strong>Faça parte do clube</strong>
              <small>Apoie a comunidade e acompanhe as novidades.</small>
              <span>
                CONHECER A ÁREA VIP <Icon name="arrow" size={16} />
              </span>
            </NavLink>
          </VipPromotion>
        )}
      </Sidebar>
      <Workspace inert={open}>
        <Header>
          <HeaderContent>
            <Breadcrumb>
              <MobileMenuButton
                ref={menuButton}
                aria-label={open ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={open}
                aria-controls="menu-principal"
                onClick={() => setOpen((value) => !value)}
              >
                <Icon name={open ? 'close' : 'menu'} />
              </MobileMenuButton>
              <span className="community-label">Comunidade&nbsp; /</span>
              <strong>{sections[pathname.split('/')[1] ?? ''] ?? 'Clash Cup'}</strong>
            </Breadcrumb>
            <nav aria-label="Sua conta">{accountMenu ?? <span>Clash Cup Brasil</span>}</nav>
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
          <small>
            Conteúdo de fãs, não oficial. Este site não é afiliado, endossado ou patrocinado pela
            Supercell. Clash Royale e seus elementos são marcas da Supercell.
          </small>
        </Footer>
      </Workspace>
    </Frame>
  );
}
