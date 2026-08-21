// src/app/comunidade/pergunta/[id]/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Input, Spin } from 'antd';
import toast from 'react-hot-toast';
import { ArrowLeft, Send } from 'lucide-react';
import { getQuestion, listAnswers, addAnswer } from '../../../lib/qa';
import { useAuth } from '../../../context/AuthContext';
import styles from './page.module.css';

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

export default function QuestionPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const q = await getQuestion(id);
        if (!q) {
          toast.error('Essa pergunta não existe.');
          return;
        }
        setQuestion(q);
        const a = await listAnswers(id);
        setAnswers(a);
      } catch (err) {
        toast.error('Não consegui carregar essa pergunta.');
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  async function handleSend() {
    if (!user) {
      toast.error('Entra na sua conta pra responder.');
      return;
    }
    const clean = text.trim();
    if (!clean) return;

    setSending(true);
    try {
      await addAnswer(id, user, clean);
      setAnswers((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, authorName: user.displayName || user.email, text: clean, createdAt: { seconds: Date.now() / 1000 } },
      ]);
      setText('');
    } catch (err) {
      toast.error('Não consegui enviar sua resposta.');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <Spin size="large" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className={styles.page}>
        <Link href="/comunidade" className={styles.backLink}>
          <ArrowLeft size={16} /> voltar pra comunidade
        </Link>
        <div className={styles.section}>
          <div className={styles.emptyState}>Essa pergunta não existe ou foi removida.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href="/comunidade" className={styles.backLink}>
        <ArrowLeft size={16} /> voltar pra comunidade
      </Link>

      <div className={styles.questionCard}>
        {question.artwork ? (
          <img src={question.artwork} alt={question.albumTitle} className={styles.cover} />
        ) : (
          <div className={styles.cover} />
        )}
        <div>
          <Link href={`/album/${question.albumId}`} className={styles.albumLine}>
            {question.albumTitle} · {question.albumArtist}
          </Link>
          <div className={styles.questionText}>{question.question}</div>
          <div className={styles.questionMeta}>
            perguntado por {question.authorName} · {timeAgo(question.createdAt)}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>{answers.length} resposta{answers.length !== 1 ? 's' : ''}</div>

        <div className={styles.answerForm}>
          <Input
            placeholder={user ? 'Escreve sua resposta…' : 'Entra na sua conta pra responder'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPressEnter={handleSend}
            disabled={!user}
          />
          <button type="button" className={styles.answerSendBtn} onClick={handleSend} disabled={sending || !user}>
            <Send size={14} />
          </button>
        </div>

        {answers.length === 0 ? (
          <div className={styles.emptyState}>Ninguém respondeu ainda. Sabe a resposta?</div>
        ) : (
          <div className={styles.answerList}>
            {answers.map((a) => (
              <div key={a.id} className={styles.answerRow}>
                <div className={styles.answerHead}>
                  <span className={styles.answerName}>{a.authorName}</span>
                  <span className={styles.answerTime}>{timeAgo(a.createdAt)}</span>
                </div>
                <p className={styles.answerText}>{a.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
