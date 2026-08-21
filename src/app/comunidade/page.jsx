// src/app/comunidade/page.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Input, Spin } from 'antd';
import toast from 'react-hot-toast';
import { ArrowLeft, Send, Plus, Search, X, Trophy, Layers, Gamepad2, MessageCircle, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { postComment, listComments } from '../lib/community';
import { createQuestion, listQuestions } from '../lib/qa';
import { listPublicTierLists, createTierList } from '../lib/tierlists';
import { fetchTopAlbums, fetchNewReleases, searchAlbums } from '../lib/musicApi';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const TABS = [
  { id: 'comentarios', label: 'Comentários', icon: MessageCircle },
  { id: 'perguntas', label: 'Perguntas & Respostas', icon: HelpCircle },
  { id: 'jogo', label: 'Jogo', icon: Gamepad2 },
  { id: 'tierlist', label: 'Tier List', icon: Layers },
];

function timeAgo(timestamp) {
  if (!timestamp?.seconds) return '';
  const diffMs = Date.now() - timestamp.seconds * 1000;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function ComunidadePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('comentarios');

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} /> voltar
      </Link>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Comunidade</h1>
        <p className={styles.pageSub}>
          Converse, tire dúvidas, jogue e monte tier lists com outras pessoas do Riffnote.
        </p>
      </div>

      <div className={styles.tabsBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabItem} ${activeTab === tab.id ? styles.tabItemActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {activeTab === 'comentarios' && <CommentsTab user={user} />}
        {activeTab === 'perguntas' && <QATab user={user} router={router} />}
        {activeTab === 'jogo' && <GameTab />}
        {activeTab === 'tierlist' && <TierListTab user={user} router={router} />}
      </div>
    </div>
  );
}

// ---------------- Comentários ----------------

function CommentsTab({ user }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    listComments()
      .then(setComments)
      .catch(() => toast.error('Não consegui carregar os comentários.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSend() {
    if (!user) {
      toast.error('Entra na sua conta pra comentar.');
      return;
    }
    const clean = text.trim();
    if (!clean) return;

    setSending(true);
    try {
      await postComment(user, clean);
      setComments((prev) => [
        { id: `local-${Date.now()}`, authorId: user.uid, authorName: user.displayName || user.email, authorPhoto: user.photoURL, text: clean, createdAt: { seconds: Date.now() / 1000 } },
        ...prev,
      ]);
      setText('');
    } catch (err) {
      toast.error('Não consegui enviar seu comentário.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className={styles.commentForm}>
        <Input
          className={styles.commentInput}
          placeholder={user ? 'Escreve algo pra comunidade…' : 'Entra na sua conta pra comentar'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPressEnter={handleSend}
          disabled={!user}
        />
        <button type="button" className={styles.commentSendBtn} onClick={handleSend} disabled={sending || !user}>
          <Send size={14} /> Enviar
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingRow}>
          <Spin size="small" /> carregando…
        </div>
      ) : comments.length === 0 ? (
        <div className={styles.emptyState}>Ninguém comentou ainda. Seja o primeiro!</div>
      ) : (
        <div className={styles.commentList}>
          {comments.map((c) => (
            <div key={c.id} className={styles.commentRow}>
              <div className={styles.commentAvatar}>
                {c.authorPhoto ? <img src={c.authorPhoto} alt="" /> : (c.authorName || '?').charAt(0).toUpperCase()}
              </div>
              <div className={styles.commentBody}>
                <div className={styles.commentHead}>
                  <span className={styles.commentName}>{c.authorName}</span>
                  <span className={styles.commentTime}>{timeAgo(c.createdAt)}</span>
                </div>
                <p className={styles.commentText}>{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Perguntas & Respostas ----------------

function QATab({ user, router }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [albumQuery, setAlbumQuery] = useState('');
  const [albumResults, setAlbumResults] = useState([]);
  const [pickedAlbum, setPickedAlbum] = useState(null);
  const [questionText, setQuestionText] = useState('');
  const [searching, setSearching] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    listQuestions()
      .then(setQuestions)
      .catch(() => toast.error('Não consegui carregar as perguntas.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSearchAlbum() {
    const term = albumQuery.trim();
    if (!term) return;
    setSearching(true);
    try {
      const results = await searchAlbums(term, { limit: 6 });
      setAlbumResults(results);
    } catch (err) {
      toast.error('Não consegui buscar álbuns.');
    } finally {
      setSearching(false);
    }
  }

  async function handlePost() {
    if (!user) {
      toast.error('Entra na sua conta pra perguntar.');
      return;
    }
    if (!pickedAlbum || !questionText.trim()) {
      toast.error('Escolhe um álbum e escreve sua pergunta.');
      return;
    }
    setPosting(true);
    try {
      const id = await createQuestion(user, pickedAlbum, questionText.trim());
      toast.success('Pergunta publicada!');
      setFormOpen(false);
      setPickedAlbum(null);
      setQuestionText('');
      setAlbumQuery('');
      setAlbumResults([]);
      router.push(`/comunidade/pergunta/${id}`);
    } catch (err) {
      toast.error('Não consegui publicar a pergunta.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <div>
      <button type="button" className={styles.qaNewBtn} onClick={() => setFormOpen((v) => !v)}>
        <Plus size={15} /> {formOpen ? 'Cancelar' : 'Nova pergunta'}
      </button>

      {formOpen && (
        <div className={styles.qaForm}>
          {pickedAlbum ? (
            <div className={styles.qaAlbumPicked}>
              {pickedAlbum.artwork && <img src={pickedAlbum.artwork} alt="" />}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>{pickedAlbum.title}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>{pickedAlbum.artist}</div>
              </div>
              <button
                type="button"
                onClick={() => setPickedAlbum(null)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <span className={styles.qaFormLabel}>Sobre qual álbum é sua pergunta?</span>
              <Input
                placeholder="Busca o álbum…"
                prefix={<Search size={14} color="#6f6860" />}
                suffix={searching ? <Spin size="small" /> : null}
                value={albumQuery}
                onChange={(e) => setAlbumQuery(e.target.value)}
                onPressEnter={handleSearchAlbum}
              />
              {albumResults.length > 0 && (
                <div className={styles.qaSearchResults}>
                  {albumResults.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className={styles.qaSearchItem}
                      onClick={() => {
                        setPickedAlbum(a);
                        setAlbumResults([]);
                      }}
                    >
                      {a.artwork && <img src={a.artwork} alt="" />}
                      {a.title} — {a.artist}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: 14 }}>
            <span className={styles.qaFormLabel}>Sua pergunta</span>
            <Input.TextArea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="O que você quer perguntar pra comunidade sobre esse álbum?"
              autoSize={{ minRows: 2, maxRows: 5 }}
            />
          </div>

          <button type="button" className={styles.qaNewBtn} style={{ marginTop: 14, marginBottom: 0 }} onClick={handlePost} disabled={posting}>
            {posting ? 'Publicando…' : 'Publicar pergunta'}
          </button>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingRow}>
          <Spin size="small" /> carregando…
        </div>
      ) : questions.length === 0 ? (
        <div className={styles.emptyState}>Nenhuma pergunta ainda. Pergunta algo!</div>
      ) : (
        <div className={styles.qaList}>
          {questions.map((q) => (
            <Link key={q.id} href={`/comunidade/pergunta/${q.id}`} className={styles.qaCard}>
              {q.artwork ? <img src={q.artwork} alt="" className={styles.qaCover} /> : <div className={styles.qaCover} />}
              <div className={styles.qaCardBody}>
                <div className={styles.qaCardAlbum}>{q.albumTitle} · {q.albumArtist}</div>
                <div className={styles.qaCardQuestion}>{q.question}</div>
                <div className={styles.qaCardMeta}>
                  {q.authorName} · {timeAgo(q.createdAt)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Jogo: adivinhe o álbum pela capa ----------------

function GameTab() {
  const [pool, setPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(null); // { answer, options }
  const [score, setScore] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchTopAlbums({ limit: 40 }),
      fetchNewReleases({ limit: 40 }).catch(() => []),
    ])
      .then(([top, recent]) => {
        // combina as duas fontes e remove álbuns repetidos (pelo id)
        const combined = [...top, ...recent];
        const seen = new Set();
        const deduped = combined.filter((a) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        });

        if (deduped.length < 4) {
          toast.error('Não achei álbuns suficientes pro jogo agora.');
          return;
        }

        setPool(deduped);
        startRound(deduped);
      })
      .catch(() => toast.error('Não consegui carregar os álbuns do jogo.'))
      .finally(() => setLoading(false));
  }, []);

  function startRound(albums) {
    const shuffled = shuffle(albums);
    const answer = shuffled[0];
    const options = shuffle([answer, ...shuffled.slice(1, 4)]);
    setRound({ answer, options });
    setSelected(null);
    setRevealed(false);
  }

  function handleGuess(option) {
    if (revealed) return;
    setSelected(option.id);
    setRevealed(true);
    setRounds((r) => r + 1);
    if (option.id === round.answer.id) {
      setScore((s) => s + 1);
      toast.success('Acertou!');
    } else {
      toast.error(`Era "${round.answer.title}"`);
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingRow}>
        <Spin /> <span>carregando o jogo…</span>
      </div>
    );
  }

  if (!round) return null;

  return (
    <div className={styles.gameWrap}>
      <div className={styles.gameScore}>
        pontos: <strong>{score}</strong> / {rounds}
      </div>

      <div className={`${styles.gameCoverWrap} ${revealed ? styles.revealed : ''}`}>
        {round.answer.artwork && <img src={round.answer.artwork} alt="capa borrada" />}
      </div>

      <div className={styles.gameOptions}>
        {round.options.map((opt) => {
          let cls = styles.gameOptionBtn;
          if (revealed && opt.id === round.answer.id) cls += ` ${styles.gameOptionCorrect}`;
          else if (revealed && opt.id === selected) cls += ` ${styles.gameOptionWrong}`;

          return (
            <button key={opt.id} type="button" className={cls} onClick={() => handleGuess(opt)} disabled={revealed}>
              {opt.title} — {opt.artist}
            </button>
          );
        })}
      </div>

      {revealed && (
        <button type="button" className={styles.gameNextBtn} onClick={() => startRound(pool)}>
          Próxima rodada
        </button>
      )}
    </div>
  );
}

// ---------------- Tier List (galeria) ----------------

function TierListTab({ user, router }) {
  const [tierLists, setTierLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    listPublicTierLists()
      .then(setTierLists)
      .catch(() => toast.error('Não consegui carregar as tier lists.'))
      .finally(() => setLoading(false));
  }, []);

  function handleOpenForm() {
    if (!user) {
      toast.error('Entra na sua conta pra criar uma tier list.');
      return;
    }
    setFormOpen((v) => !v);
  }

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title) {
      toast.error('Dá um nome pra sua tier list.');
      return;
    }

    setCreating(true);
    try {
      const id = await createTierList(user, title);
      router.push(`/tierlist/${id}`);
    } catch (err) {
      toast.error('Não consegui criar a tier list.');
      setCreating(false);
    }
  }

  return (
    <div>
      <div className={styles.tierHeadRow}>
        <span style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>
          Monte sua ranking de álbuns em tiers, ou pega uma tier list de alguém e faça a sua versão.
        </span>
        <button type="button" className={styles.tierCreateBtn} onClick={handleOpenForm}>
          <Plus size={15} /> {formOpen ? 'Cancelar' : 'Criar tier list'}
        </button>
      </div>

      {formOpen && (
        <div className={styles.qaForm} style={{ marginBottom: 24 }}>
          <span className={styles.qaFormLabel}>Nome da sua tier list</span>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onPressEnter={handleCreate}
            placeholder="Ex: Melhores álbuns dos anos 2000"
            autoFocus
          />
          <button
            type="button"
            className={styles.qaNewBtn}
            style={{ marginTop: 14, marginBottom: 0 }}
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? 'Criando…' : 'Criar e começar a montar'}
          </button>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingRow}>
          <Spin /> <span>carregando…</span>
        </div>
      ) : tierLists.length === 0 ? (
        <div className={styles.emptyState}>Nenhuma tier list ainda. Cria a primeira!</div>
      ) : (
        <div className={styles.tierGrid}>
          {tierLists.map((t) => {
            const totalAlbums = t.pool.length + t.tiers.reduce((sum, tier) => sum + tier.items.length, 0);
            return (
              <Link key={t.id} href={`/tierlist/${t.id}`} className={styles.tierCard}>
                <Trophy size={16} color="#e8963c" />
                <div className={styles.tierCardTitle} style={{ marginTop: 8 }}>{t.title}</div>
                <div className={styles.tierCardOwner}>por {t.ownerName} · {totalAlbums} álbuns</div>
                <div className={styles.tierCardPreview}>
                  {t.tiers.slice(0, 3).map((tier) => (
                    <div key={tier.id} className={styles.tierCardPreviewRow}>
                      <span className={styles.tierCardPreviewLabel} style={{ background: tier.color }}>
                        {tier.label}
                      </span>
                      <span className={styles.tierCardPreviewCount}>{tier.items.length} álbuns</span>
                    </div>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}