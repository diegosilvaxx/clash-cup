import styled from 'styled-components';
import { ActionLink, Container } from '@clash-cup/ui';
import logo from '../assets/logo.png';

const Hero = styled.section`
  background: #182c59;
  color: white;
`;
const HeroContent = styled(Container)`
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  align-items: center;
  gap: 64px;
  padding-top: 76px;
  padding-bottom: 76px;
  h1 {
    font-size: clamp(36px, 4.8vw, 64px);
    line-height: 1.08;
    letter-spacing: -2px;
    margin-bottom: 24px;
  }
  p {
    color: #d7e2fa;
    max-width: 490px;
  }
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 32px;
    padding-top: 48px;
    padding-bottom: 48px;
  }
`;
const Eyebrow = styled.p`
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
`;
const Illustration = styled.div`
  max-width: 290px;
  padding: 32px;
  background: #fff;
  border-radius: 28px;
  justify-self: center;
  transform: rotate(3deg);
  img {
    display: block;
  }
  @media (max-width: 700px) {
    max-width: 190px;
    padding: 20px;
  }
`;
const SectionHeading = styled.h2`
  font-size: clamp(26px, 3vw, 36px);
  letter-spacing: -1px;
  margin-bottom: 14px;
`;
const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-top: 32px;
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;
const Card = styled.article`
  border: 1px solid #dfe5f0;
  background: white;
  border-radius: 16px;
  padding: 28px;
  h3 {
    font-size: 20px;
    margin-top: 20px;
  }
  p {
    color: #53617b;
    margin-bottom: 0;
  }
  span {
    display: inline-flex;
    width: 40px;
    height: 40px;
    align-items: center;
    justify-content: center;
    background: #eaf0ff;
    color: #253e78;
    border-radius: 12px;
    font-weight: 800;
  }
`;

export function App() {
  return (
    <>
      <Hero>
        <HeroContent>
          <div>
            <Eyebrow>Clash Cup Brasil</Eyebrow>
            <h1>Seu próximo desafio começa aqui.</h1>
            <p>Uma comunidade para jogar, evoluir e competir em torneios online de Clash Royale.</p>
            <ActionLink href="#como-funciona">Conheça a comunidade</ActionLink>
          </div>
          <Illustration>
            <img src={logo} alt="Clash Cup" width="1488" height="1664" />
          </Illustration>
        </HeroContent>
      </Hero>
      <Container as="section" id="como-funciona" aria-labelledby="community-title">
        <Eyebrow>Do seu jeito. No seu ritmo.</Eyebrow>
        <SectionHeading id="community-title">O lugar de quem gosta de competir.</SectionHeading>
        <p>
          Não importa o seu nível: sempre existe espaço para aprender e buscar a próxima vitória.
        </p>
        <Cards>
          <Card>
            <span aria-hidden="true">01</span>
            <h3>Jogue de onde estiver</h3>
            <p>
              Os torneios acontecem online. Você participa de casa, com o seu próprio dispositivo.
            </p>
          </Card>
          <Card>
            <span aria-hidden="true">02</span>
            <h3>Evolua a cada partida</h3>
            <p>
              Coloque suas estratégias em prática e compartilhe experiências com outros jogadores.
            </p>
          </Card>
          <Card>
            <span aria-hidden="true">03</span>
            <h3>Faça parte da comunidade</h3>
            <p>
              Um espaço para jogadores de diferentes níveis que compartilham a paixão por Clash
              Royale.
            </p>
          </Card>
        </Cards>
      </Container>
    </>
  );
}
