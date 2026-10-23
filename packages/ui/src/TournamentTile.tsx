import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { artwork } from './artwork';
import { Icon } from './Icon';
import { buttonStyle, surface } from './styles';

const Tile = styled.article`
  ${surface} overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition:
    border-color 0.2s,
    transform 0.2s,
    box-shadow 0.2s;
  &:hover {
    border-color: #4682bd;
  }
  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 28px #02081466;
    }
    &:hover img {
      transform: scale(1.04);
    }
  }
`;
const Cover = styled.div`
  position: relative;
  height: 146px;
  overflow: hidden;
  background: #12325e;
  > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.35s ease;
    object-position: center 45%;
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(transparent 45%, #0f203c);
  }
  > span {
    position: absolute;
    bottom: 12px;
    left: 20px;
    z-index: 1;
    display: inline-flex;
    padding: 6px;
    color: var(--cup-gold);
    border-radius: 9px;
    background: #0c1c36d9;
  }
`;
const Body = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 18px 20px 20px;
  h2,
  h3 {
    font-size: 1.3rem;
    margin: 12px 0 8px;
  }
  p {
    font-size: 0.85rem;
    margin-bottom: 14px;
  }
  .description {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .status {
    align-self: flex-start;
    padding: 4px 9px;
    background: #0c3432;
    border: 1px solid #27645b;
    border-radius: 20px;
    color: #7fefc4;
    font-size: 0.7rem;
    font-weight: 700;
  }
  .status[data-open='false'] {
    background: #1e2c43;
    color: var(--cup-muted);
    border-color: var(--cup-border);
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 18px;
    margin-top: auto;
    margin-bottom: 14px;
    font-size: 0.78rem;
    color: #c7d7ed;
  }
  .meta span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
  progress {
    appearance: none;
    width: 100%;
    height: 7px;
    border: 0;
    border-radius: 10px;
    overflow: hidden;
    background: #233a59;
    margin: 0 0 15px;
  }
  progress::-webkit-progress-bar {
    background: #233a59;
    border-radius: 10px;
  }
  progress::-webkit-progress-value {
    background: linear-gradient(90deg, #1bbaf0, #0871f2);
    border-radius: 10px;
  }
  progress::-moz-progress-bar {
    background: #1296ff;
  }
`;
const TileLink = styled(Link)`
  ${buttonStyle} width: 100%;
`;
const TitleLink = styled(Link)`
  text-decoration: none;
`;

export function TournamentTile({
  name,
  to,
  date,
  occupied,
  capacity,
  open,
  description,
  headingLevel = 'h3',
}: {
  name: string;
  to: string;
  date: string;
  occupied: number;
  capacity: number;
  open: boolean;
  description: string;
  headingLevel?: 'h2' | 'h3';
}) {
  const Heading = headingLevel;
  const parsedDate = date && /^\d{4}-\d{2}-\d{2}T/.test(date) ? new Date(date) : null;
  const label =
    parsedDate && Number.isFinite(parsedDate.getTime())
      ? new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(parsedDate)
      : date || 'Data a confirmar';
  const available = open && occupied < capacity;
  return (
    <Tile>
      <Cover>
        <img src={artwork.landscape} alt="" width="1280" height="630" loading="lazy" />
        <span>
          <Icon name="trophy" size={28} />
        </span>
      </Cover>
      <Body>
        <span className="status" data-open={available}>
          {!open ? 'Inscrições encerradas' : available ? 'Inscrições abertas' : 'Vagas esgotadas'}
        </span>
        <Heading>
          <TitleLink to={to}>{name}</TitleLink>
        </Heading>
        <p className="description">
          {description || 'Prepare seu deck e participe com a comunidade.'}
        </p>
        <div className="meta">
          <span>
            <Icon name="calendar" size={16} />
            {label}
          </span>
          <span>
            <Icon name="user" size={16} />
            {occupied} / {capacity} jogadores
          </span>
        </div>
        <progress
          value={occupied}
          max={Math.max(capacity, 1)}
          aria-label={`Vagas ocupadas em ${name}`}
        />
        <TileLink to={to}>
          Ver torneio
          <Icon name="arrow" size={18} />
        </TileLink>
      </Body>
    </Tile>
  );
}
