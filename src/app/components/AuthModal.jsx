// src/app/components/AuthModal.jsx
'use client';

import { useState } from 'react';
import { Modal, Input } from 'antd';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './AuthModal.module.css';

// Traduz os códigos de erro mais comuns do Firebase Auth para PT-BR.
function translateAuthError(code) {
  const map = {
    'auth/email-already-in-use': 'Esse e-mail já está cadastrado.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/user-not-found': 'Não existe conta com esse e-mail.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/too-many-requests': 'Muitas tentativas. Espera um pouco e tenta de novo.',
    'auth/popup-closed-by-user': 'Login cancelado.',
  };
  return map[code] || 'Algo deu errado. Tenta de novo.';
}

export default function AuthModal({ open, initialTab = 'login', onClose }) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function resetForm() {
    setDisplayName('');
    setEmail('');
    setPassword('');
    setError('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'signup') {
        if (!displayName.trim()) {
          setError('Digite seu nome.');
          setLoading(false);
          return;
        }
        await signUp(email, password, displayName.trim());
        toast.success(`Bem-vindo(a), ${displayName}!`);
      } else {
        await signIn(email, password);
        toast.success('Login feito com sucesso.');
      }
      handleClose();
    } catch (err) {
      setError(translateAuthError(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      toast.success('Login com Google feito com sucesso.');
      handleClose();
    } catch (err) {
      setError(translateAuthError(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      title={null}
      closeIcon={<X size={18} color="#a89f92" />}
      width={400}
    >
      <div className={styles.wrap}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'login' ? styles.tabActive : ''}`}
            onClick={() => {
              setTab('login');
              setError('');
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'signup' ? styles.tabActive : ''}`}
            onClick={() => {
              setTab('signup');
              setError('');
            }}
          >
            Criar conta
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {tab === 'signup' && (
            <div className={styles.field}>
              <label className={styles.label}>Nome</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Como te chamam"
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>E-mail</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Senha</label>
            <Input.Password
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 6 caracteres"
              required
            />
          </div>

          {error && <span className={styles.errorText}>{error}</span>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Aguarda…' : tab === 'signup' ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <div className={styles.divider}>ou</div>

        <button type="button" className={styles.googleBtn} onClick={handleGoogle} disabled={loading}>
          Continuar com Google
        </button>
      </div>
    </Modal>
  );
}
