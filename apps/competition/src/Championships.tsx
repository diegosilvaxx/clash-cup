import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { useSession } from '@clash-cup/session';
import {
  championships,
  championshipSchema,
  emptyChampionship,
  buildBracket,
  bronzeMatch,
  recordScore,
  shufflePlayers,
  roundLabel,
  competitionError,
  type Championship,
  type ChampionshipInput,
  type BracketMatch,
} from '@clash-cup/competitions';
import { Container, Icon, artwork } from '@clash-cup/ui';
import { Actions, Button, Card, Feedback, Grid, Navigation } from './styles';
import { Banner, Board, Champion, Editor, Match } from './championship.styles';
import { championshipUrl, downloadPoster, prepareCover } from './championship-media';

function message(error: unknown) {
  if (error instanceof z.ZodError)
    return error.issues[0]?.message ?? 'Confira os dados informados.';
  if (error instanceof Error && !('code' in error)) return error.message;
  return competitionError(error);
}
function inputOf(item: Championship): ChampionshipInput {
  return {
    name: item.name,
    description: item.description,
    size: item.size,
    players: item.players,
    startsAt: item.startsAt,
    bestOf: item.bestOf,
    thirdPlace: item.thirdPlace,
    cover: item.cover,
    status: item.status,
    scores: item.scores,
  };
}
function MyChampionships() {
  const state = useSession();
  const uid = state.user?.uid;
  const [result, setResult] = useState<{
    uid: string;
    items: Championship[];
    error: string | null;
  } | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!uid) return;
    let active = true;
    void championships.list(uid).then(
      (items) => {
        if (active) setResult({ uid, items, error: null });
      },
      (error) => {
        if (active) setResult({ uid, items: [], error: message(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [uid, revision]);
  return (
    <>
      <h1>Meus campeonatos</h1>
      <p>Sua arena, suas regras. Organize os confrontos e compartilhe cada conquista.</p>
      {state.status === 'initializing' ? (
        <p role="status">Carregando sua conta…</p>
      ) : !uid ? (
        <p>
          <Link to="/entrar">Entre na sua conta</Link> para criar e gerenciar campeonatos.
        </p>
      ) : (
        <>
          <Actions>
            <Link to="/campeonatos/novo">Criar campeonato →</Link>
          </Actions>
          {result?.uid !== uid ? (
            <p role="status">Carregando campeonatos…</p>
          ) : result.error ? (
            <>
              <Feedback role="alert">{result.error}</Feedback>
              <Button onClick={() => setRevision((value) => value + 1)}>Tentar novamente</Button>
            </>
          ) : !result.items.length ? (
            <Card>
              <h2>Sua próxima disputa começa aqui</h2>
              <p>
                Crie uma chave com 8, 16 ou 32 jogadores. Você pode salvar um rascunho antes de
                publicar.
              </p>
            </Card>
          ) : (
            <Grid>
              {result.items.map((item) => (
                <Card key={item.id}>
                  <img
                    src={item.cover || artwork.landscape}
                    alt=""
                    width="400"
                    height="180"
                    style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10 }}
                  />
                  <h2>{item.name}</h2>
                  <p>
                    {item.size} jogadores ·{' '}
                    {item.status === 'draft' ? 'Rascunho privado' : 'Publicado'}
                  </p>
                  <Link to={`/campeonatos/${item.id}`}>
                    {item.status === 'draft' ? 'Continuar campeonato' : 'Ver chaveamento'}
                  </Link>
                </Card>
              ))}
            </Grid>
          )}
        </>
      )}
    </>
  );
}
function ChampionshipEditor({ previous }: { previous: Championship | null }) {
  const state = useSession();
  const navigate = useNavigate();
  const [fields, setFields] = useState<ChampionshipInput>(() =>
    previous ? inputOf(previous) : emptyChampionship(),
  );
  const [pending, setPending] = useState(false);
  const [imagePending, setImagePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const busy = useRef(false);
  if (state.status === 'initializing') return <p role="status">Carregando sua conta…</p>;
  if (!state.user)
    return (
      <p>
        <Link to="/entrar">Entre na sua conta</Link> para criar um campeonato.
      </p>
    );
  if (previous && previous.ownerUid !== state.user.uid)
    return <Feedback role="alert">Só o criador pode editar este campeonato.</Feedback>;
  const uid = state.user.uid;
  function changeSize(size: 8 | 16 | 32) {
    if (
      size < fields.size &&
      fields.players.slice(size).some(Boolean) &&
      !window.confirm('A lista tem mais jogadores que o tamanho escolhido. Remover os excedentes?')
    )
      return;
    setFields((current) => ({
      ...current,
      size,
      players: Array.from({ length: size }, (_, index) => current.players[index] ?? ''),
    }));
  }
  async function save(status: ChampionshipInput['status']) {
    if (busy.current || imagePending) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const data = championshipSchema.parse({ ...fields, status });
      const item = await championships.save(uid, data, previous);
      navigate(`/campeonatos/${item.id}`, { replace: true });
    } catch (error) {
      setError(message(error));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  function importPlayers() {
    const names = importText
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);
    if (
      names.length > fields.size ||
      names.some((name) => name.length > 40) ||
      new Set(names.map((name) => name.toLocaleLowerCase('pt-BR'))).size !== names.length
    ) {
      setError(`Importe até ${fields.size} nomes diferentes, com até 40 caracteres cada.`);
      return;
    }
    setFields((current) => ({
      ...current,
      players: Array.from({ length: current.size }, (_, index) => names[index] ?? ''),
    }));
    setImportText('');
    setError(null);
  }
  return (
    <>
      <h1>{previous ? 'Editar rascunho' : 'Criar campeonato'}</h1>
      <p>Escolha a arena, reúna os jogadores e prepare a disputa.</p>
      {error && <Feedback role="alert">{error}</Feedback>}
      <Editor
        onSubmit={(event) => {
          event.preventDefault();
          void save('published');
        }}
      >
        <fieldset disabled={pending || imagePending}>
          <legend>1. Informações do campeonato</legend>
          <label>
            Nome do campeonato
            <input
              value={fields.name}
              maxLength={80}
              onChange={(event) => setFields({ ...fields, name: event.target.value })}
            />
          </label>
          <img
            className="cover"
            src={fields.cover || artwork.landscape}
            alt="Prévia da capa do campeonato"
            width="1000"
            height="500"
          />
          <label>
            Capa do campeonato
            <input
              type="file"
              aria-label="Capa do campeonato"
              aria-describedby="cover-help"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                setImagePending(true);
                setError(null);
                void prepareCover(file)
                  .then(
                    (cover) => setFields((current) => ({ ...current, cover })),
                    (error) => setError(message(error)),
                  )
                  .finally(() => setImagePending(false));
              }}
            />
            <small id="cover-help">JPG, PNG ou WebP de até 8 MB. O recorte é horizontal.</small>
          </label>
          {fields.cover && (
            <Button type="button" onClick={() => setFields({ ...fields, cover: '' })}>
              Usar capa padrão
            </Button>
          )}
          <div className="pair">
            <label>
              Competidores
              <select
                aria-label="Competidores"
                value={fields.size}
                onChange={(event) => changeSize(Number(event.target.value) as 8 | 16 | 32)}
              >
                <option value={8}>8 jogadores</option>
                <option value={16}>16 jogadores</option>
                <option value={32}>32 jogadores</option>
              </select>
            </label>
            <label>
              Formato das partidas
              <select
                value={fields.bestOf}
                onChange={(event) =>
                  setFields({ ...fields, bestOf: Number(event.target.value) as 1 | 3 | 5 })
                }
              >
                <option value={1}>Partida única</option>
                <option value={3}>Melhor de 3</option>
                <option value={5}>Melhor de 5</option>
              </select>
            </label>
          </div>
          <label>
            Data e horário (seu fuso local)
            <input
              type="datetime-local"
              value={fields.startsAt ? localDate(fields.startsAt) : ''}
              onChange={(event) =>
                setFields({
                  ...fields,
                  startsAt: event.target.value ? new Date(event.target.value).toISOString() : '',
                })
              }
            />
          </label>
          <label>
            Regras e descrição
            <textarea
              rows={4}
              value={fields.description}
              maxLength={1000}
              onChange={(event) => setFields({ ...fields, description: event.target.value })}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={fields.thirdPlace}
              onChange={(event) => setFields({ ...fields, thirdPlace: event.target.checked })}
            />
            Disputa de terceiro lugar
          </label>
          <small>
            Eliminação simples. Os nomes e a capa ficam públicos após a publicação. Use apelidos com
            autorização dos participantes.
          </small>
        </fieldset>
        <fieldset disabled={pending || imagePending}>
          <legend>
            2. Jogadores ({fields.players.filter((name) => name.trim()).length}/{fields.size})
          </legend>
          <details>
            <summary>Importar lista de jogadores</summary>
            <label>
              Um nome por linha
              <textarea
                rows={5}
                value={importText}
                maxLength={2000}
                onChange={(event) => setImportText(event.target.value)}
              />
            </label>
            <Button type="button" disabled={!importText.trim()} onClick={importPlayers}>
              Aplicar lista
            </Button>
          </details>
          <Actions>
            <Button
              type="button"
              onClick={() => setFields({ ...fields, players: shufflePlayers(fields.players) })}
            >
              Sortear confrontos
            </Button>
          </Actions>
          <p>A ordem da lista define os pares: 1 × 2, 3 × 4 e assim por diante.</p>
          <div className="players">
            {fields.players.map((name, index) => (
              <label key={index}>
                Jogador {index + 1}
                <input
                  value={name}
                  maxLength={40}
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      players: current.players.map((value, position) =>
                        position === index ? event.target.value : value,
                      ),
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>
        <div className="footer">
          <Button
            type="button"
            disabled={pending || imagePending}
            onClick={() => void save('draft')}
          >
            Salvar rascunho
          </Button>
          <Button type="submit" disabled={pending || imagePending}>
            {pending
              ? 'Salvando…'
              : imagePending
                ? 'Preparando capa…'
                : 'Publicar e gerar chaveamento'}
          </Button>
        </div>
      </Editor>
    </>
  );
}
function localDate(iso: string) {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function ScoreMatch({
  match,
  item,
  editable,
  pending,
  onSave,
}: {
  match: BracketMatch;
  item: Championship;
  editable: boolean;
  pending: boolean;
  onSave: (key: string, score: [number, number]) => void;
}) {
  const [score, setScore] = useState<[string, string]>([
    String(match.score?.[0] ?? 0),
    String(match.score?.[1] ?? 0),
  ]);
  function submit(event: FormEvent) {
    event.preventDefault();
    onSave(match.key, [Number(score[0]), Number(score[1])]);
  }
  return (
    <Match aria-label={`Confronto ${match.key}`}>
      {match.players.map((player, index) => (
        <div
          key={index}
          className={`player ${player !== null && player === match.winner ? 'winner' : ''}`}
        >
          <span>{player === null ? 'A definir' : item.players[player]}</span>
          <b>{match.score?.[index] ?? '—'}</b>
        </div>
      ))}
      {editable && match.players.every((player) => player !== null) && (
        <form onSubmit={submit}>
          <div className="score-inputs">
            {match.players.map((player, index) => (
              <label key={index}>
                <span
                  className="sr-only"
                  style={{
                    position: 'absolute',
                    width: 1,
                    height: 1,
                    overflow: 'hidden',
                    clipPath: 'inset(50%)',
                  }}
                >
                  Placar de {item.players[player!]}
                </span>
                <input
                  aria-label={`Placar de ${item.players[player!]}`}
                  type="number"
                  min="0"
                  max={Math.ceil(item.bestOf / 2)}
                  required
                  disabled={pending}
                  value={score[index]}
                  onChange={(event) =>
                    setScore((current) =>
                      index === 0
                        ? [event.target.value, current[1]]
                        : [current[0], event.target.value],
                    )
                  }
                />
              </label>
            ))}
          </div>
          <Button disabled={pending} type="submit">
            {match.score ? 'Corrigir placar' : 'Salvar placar'}
          </Button>
        </form>
      )}
    </Match>
  );
}
function ChampionshipDetail({ item: initial }: { item: Championship }) {
  const state = useSession();
  const [item, setItem] = useState(initial);
  const [selected, setSelected] = useState(0);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const busy = useRef(false);
  const owner = state.user?.uid === item.ownerUid;
  const rounds = buildBracket(item);
  const winner = rounds.at(-1)?.[0]?.winner ?? null;
  const champion = winner === null ? null : (item.players[winner] ?? null);
  async function saveScore(key: string, score: [number, number]) {
    if (busy.current || !owner || !state.user) return;
    if (item.scores[key]?.[0] === score[0] && item.scores[key]?.[1] === score[1]) {
      setFeedback({ error: false, text: 'O placar não mudou.' });
      return;
    }
    if (
      item.scores[key] &&
      !window.confirm(
        'Corrigir este placar remove os resultados seguintes que dependem dele. Continuar?',
      )
    )
      return;
    busy.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const input = recordScore(inputOf(item), key, score);
      const next = await championships.save(state.user.uid, input, item);
      setItem(next);
      setFeedback({ error: false, text: 'Placar salvo.' });
    } catch (error) {
      setFeedback({ error: true, text: message(error) });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function share(kind: 'copy' | 'image') {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setFeedback(null);
    try {
      if (kind === 'copy') {
        await navigator.clipboard.writeText(championshipUrl(item.id));
        setFeedback({ error: false, text: 'Link copiado.' });
      } else {
        await downloadPoster(item, champion);
        setFeedback({ error: false, text: 'Imagem pronta para compartilhar.' });
      }
    } catch {
      setFeedback({
        error: true,
        text: 'Não foi possível compartilhar. Você pode copiar o endereço público abaixo.',
      });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <>
      <Link to="/meus-campeonatos">← Meus campeonatos</Link>
      <Banner>
        <img src={item.cover || artwork.landscape} alt="" />
        <h1>{item.name}</h1>
        <p>
          {item.size} jogadores · Melhor de {item.bestOf} ·{' '}
          {item.status === 'draft' ? 'Rascunho privado' : 'Eliminação simples'}
        </p>
        {item.startsAt && (
          <p>
            {new Date(item.startsAt).toLocaleString('pt-BR', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
          </p>
        )}
      </Banner>
      {feedback && <Feedback role={feedback.error ? 'alert' : 'status'}>{feedback.text}</Feedback>}
      {item.status === 'draft' ? (
        <>
          <p>Este rascunho só pode ser visto por você. Complete os jogadores para publicar.</p>
          {owner && (
            <Actions>
              <Link to={`/campeonatos/${item.id}/editar`}>Editar rascunho e publicar →</Link>
            </Actions>
          )}
        </>
      ) : (
        <>
          <Actions>
            <Button disabled={pending} onClick={() => void share('copy')}>
              Copiar link
            </Button>
            <Button disabled={pending} onClick={() => void share('image')}>
              Baixar arte JPG
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${item.name} — acompanhe os confrontos: ${championshipUrl(item.id)}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Compartilhar no WhatsApp ↗
            </a>
          </Actions>
          <p>
            <a href={championshipUrl(item.id)}>Link público do campeonato</a>
          </p>
        </>
      )}
      <Board aria-label="Chaveamento do campeonato">
        <div className="rounds" aria-label="Rodadas">
          {rounds.map((_, index) => (
            <Button
              key={index}
              type="button"
              aria-pressed={selected === index}
              onClick={() => {
                setSelected(index);
                document
                  .getElementById(`round-${index}`)
                  ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
              }}
            >
              {roundLabel(index, rounds.length)}
            </Button>
          ))}
        </div>
        <p className="mobile-round">Selecione uma rodada para acompanhar os confrontos.</p>
        <div className="scroll">
          <div className="bracket">
            {rounds.map((matches, index) => (
              <section
                className="round"
                id={`round-${index}`}
                key={index}
                data-selected={selected === index}
                aria-label={roundLabel(index, rounds.length)}
              >
                <h2>{roundLabel(index, rounds.length)}</h2>
                <div className="matches">
                  {matches.map((match) => (
                    <div
                      className="branch"
                      data-outgoing={index < rounds.length - 1}
                      key={match.key}
                    >
                      <ScoreMatch
                        key={`${match.key}:${match.players.join(',')}:${match.score?.join(',')}`}
                        match={match}
                        item={item}
                        editable={owner && item.status === 'published'}
                        pending={pending}
                        onSave={(key, score) => void saveScore(key, score)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
        {champion && (
          <Champion>
            <Icon name="trophy" size={40} />
            <strong>{champion}</strong>
            <span>CAMPEÃO</span>
          </Champion>
        )}
      </Board>
      {item.thirdPlace && (
        <Card style={{ maxWidth: 400, marginTop: 24 }}>
          <h2>Disputa de terceiro lugar</h2>
          <ScoreMatch
            key={`bronze:${bronzeMatch(item).players.join(',')}:${item.scores.bronze?.join(',')}`}
            match={bronzeMatch(item)}
            item={item}
            editable={owner && item.status === 'published'}
            pending={pending}
            onSave={(key, score) => void saveScore(key, score)}
          />
        </Card>
      )}
      {item.description && (
        <Card style={{ marginTop: 24 }}>
          <h2>Regras e informações</h2>
          <p>{item.description}</p>
        </Card>
      )}
      {owner && item.status === 'published' && (
        <p>
          Somente você pode registrar os placares. Os resultados são informados pelo organizador e
          não alteram o ranking oficial. Para acompanhar mudanças de outra aba, atualize a página.
        </p>
      )}
    </>
  );
}
function LoadChampionship({ edit = false }: { edit?: boolean }) {
  const { id = '' } = useParams();
  const state = useSession();
  const [result, setResult] = useState<{ item: Championship | null; error: string | null } | null>(
    null,
  );
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (state.status === 'initializing') return;
    let active = true;
    void championships.get(id).then(
      (item) => {
        if (active) setResult({ item, error: null });
      },
      (error) => {
        if (active) setResult({ item: null, error: message(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [id, state.status, state.user?.uid, revision]);
  if (!result) return <p role="status">Carregando campeonato…</p>;
  if (result.error)
    return (
      <>
        <h1>Campeonato indisponível</h1>
        <Feedback role="alert">{result.error}</Feedback>
        <Button onClick={() => setRevision((value) => value + 1)}>Tentar novamente</Button>
      </>
    );
  if (!result.item)
    return (
      <>
        <h1>Campeonato não encontrado</h1>
        <Link to="/meus-campeonatos">Ver meus campeonatos</Link>
      </>
    );
  if (edit && result.item.status === 'published')
    return (
      <>
        <h1>Campeonato publicado</h1>
        <p>Os participantes e o formato ficam definidos após publicar.</p>
        <Link to={`/campeonatos/${id}`}>Ver chaveamento</Link>
      </>
    );
  return edit ? (
    <ChampionshipEditor previous={result.item} />
  ) : (
    <ChampionshipDetail item={result.item} />
  );
}
export function Championships() {
  const state = useSession();
  const { pathname } = useLocation();
  return (
    <Container>
      <Navigation aria-label="Competições">
        <Link to="/torneios">Todos os torneios</Link>
        <Link to="/meus-torneios">Minhas inscrições</Link>
        <Link to="/meus-campeonatos">Meus campeonatos</Link>
      </Navigation>
      <Routes>
        <Route
          path="/meus-campeonatos"
          element={<MyChampionships key={state.user?.uid ?? 'anonymous'} />}
        />
        <Route
          path="/campeonatos/novo"
          element={<ChampionshipEditor key={state.user?.uid ?? 'anonymous'} previous={null} />}
        />
        <Route
          path="/campeonatos/:id/editar"
          element={<LoadChampionship key={`${state.user?.uid}:${pathname}:edit`} edit />}
        />
        <Route
          path="/campeonatos/:id"
          element={<LoadChampionship key={`${state.user?.uid}:${pathname}`} />}
        />
      </Routes>
    </Container>
  );
}
