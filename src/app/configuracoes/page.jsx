// src/app/configuracoes/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input, Select, Spin } from 'antd';
import toast from 'react-hot-toast';
import { ArrowLeft, User, ShieldCheck, Lock, Save, Mail, KeyRound } from 'lucide-react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { changeEmail, changePassword } from '../lib/account';
import { useAuth } from '../context/AuthContext';
import AvatarFrame, { AVATAR_FRAMES } from '../components/AvatarFrame';
import styles from './page.module.css';

const PRONOUN_OPTIONS = [
  { value: '', label: 'Prefiro não dizer' },
  { value: 'ele/dele', label: 'Ele/dele' },
  { value: 'ela/dela', label: 'Ela/dela' },
  { value: 'elu/delu', label: 'Elu/delu' },
  { value: 'outro', label: 'Outro (escreve na bio)' },
];

const REPLY_OPTIONS = [
  {
    value: 'anyone',
    label: 'Qualquer pessoa',
    desc: 'Qualquer usuário do Riffnote pode responder suas resenhas e listas.',
  },
  {
    value: 'friends',
    label: 'Amigos (pessoas que você segue)',
    desc: 'Só quem você segue pode responder seu conteúdo.',
  },
  {
    value: 'you',
    label: 'Só você',
    desc: 'Ninguém além de você pode responder.',
  },
];

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
      onClick={onClick}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loadingUser } = useAuth();

  const [section, setSection] = useState('perfil');
  const [loadingData, setLoadingData] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const [form, setForm] = useState({
    username: '',
    givenName: '',
    familyName: '',
    location: '',
    website: '',
    bio: '',
    pronoun: '',
    avatarFrame: 'none',
  });
  const [repliesPermission, setRepliesPermission] = useState('anyone');

  // --- troca de e-mail ---
  const [emailFormOpen, setEmailFormOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');

  // --- troca de senha ---
  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/login');
    }
  }, [loadingUser, user, router]);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setForm({
            username: data.username || '',
            givenName: data.givenName || '',
            familyName: data.familyName || '',
            location: data.location || '',
            website: data.website || '',
            bio: data.bio || '',
            pronoun: data.pronoun || '',
            avatarFrame: data.avatarFrame || 'none',
          });
          setRepliesPermission(data.repliesPermission || 'anyone');
        }
      } catch (err) {
        toast.error('Não consegui carregar suas configurações.');
      } finally {
        setLoadingData(false);
      }
    }

    load();
  }, [user]);

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...form,
        updatedAt: serverTimestamp(),
      });

      // Se a pessoa preencheu nome + sobrenome, atualiza o nome exibido
      // no app (navbar, perfil) pra refletir o nome completo.
      const fullName = [form.givenName, form.familyName].filter(Boolean).join(' ');
      if (fullName && fullName !== user.displayName) {
        await updateAuthProfile(auth.currentUser, { displayName: fullName });
      }

      toast.success('Perfil atualizado.');
    } catch (err) {
      toast.error('Não consegui salvar seu perfil.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSavePrivacy() {
    setSavingPrivacy(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        repliesPermission,
        updatedAt: serverTimestamp(),
      });
      toast.success('Preferências de privacidade salvas.');
    } catch (err) {
      toast.error('Não consegui salvar suas preferências.');
    } finally {
      setSavingPrivacy(false);
    }
  }

  async function handleChangeEmail() {
    setEmailError('');
    if (!newEmail || !emailPassword) {
      setEmailError('Preenche o novo e-mail e sua senha atual.');
      return;
    }
    setSavingEmail(true);
    try {
      await changeEmail(newEmail, emailPassword);
      toast.success(`Enviamos um link de confirmação pra ${newEmail}. Confirma por lá pra concluir a troca.`);
      setEmailFormOpen(false);
      setNewEmail('');
      setEmailPassword('');
    } catch (err) {
      const map = {
        'auth/wrong-password': 'Senha atual incorreta.',
        'auth/invalid-credential': 'Senha atual incorreta.',
        'auth/email-already-in-use': 'Esse e-mail já está em uso por outra conta.',
        'auth/invalid-email': 'E-mail inválido.',
        'auth/requires-recent-login': 'Por segurança, faz login de novo e tenta outra vez.',
      };
      setEmailError(map[err.code] || 'Não consegui trocar o e-mail. Tenta de novo.');
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Preenche todos os campos.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Senha alterada com sucesso.');
      setPasswordFormOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const map = {
        'auth/wrong-password': 'Senha atual incorreta.',
        'auth/invalid-credential': 'Senha atual incorreta.',
        'auth/weak-password': 'A nova senha é fraca demais.',
        'auth/requires-recent-login': 'Por segurança, faz login de novo e tenta outra vez.',
      };
      setPasswordError(map[err.code] || 'Não consegui trocar a senha. Tenta de novo.');
    } finally {
      setSavingPassword(false);
    }
  }

  if (loadingUser || !user || loadingData) {
    return (
      <div className={styles.loadingPage}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href="/profile" className={styles.backLink}>
        <ArrowLeft size={16} /> voltar pro perfil
      </Link>

      <h1 className={styles.pageTitle}>Configurações</h1>

      <div className={styles.layout}>
        <nav className={styles.nav}>
          <NavItem icon={User} label="Perfil" active={section === 'perfil'} onClick={() => setSection('perfil')} />
          <NavItem icon={ShieldCheck} label="Conta" active={section === 'conta'} onClick={() => setSection('conta')} />
          <NavItem
            icon={Lock}
            label="Privacidade"
            active={section === 'privacidade'}
            onClick={() => setSection('privacidade')}
          />
        </nav>

        <div>
          {/* ---------------- PERFIL ---------------- */}
          {section === 'perfil' && (
            <>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Moldura do avatar</div>
                <div className={styles.cardSub}>
                  Um efeito animado ao redor da sua foto de perfil. Aparece em todo lugar
                  que sua foto aparece no Riffnote.
                </div>

                <div className={styles.frameGrid}>
                  {AVATAR_FRAMES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`${styles.frameOption} ${
                        form.avatarFrame === f.id ? styles.frameOptionActive : ''
                      }`}
                      onClick={() => updateField('avatarFrame', f.id)}
                    >
                      <div className={styles.framePreview}>
                        <AvatarFrame frame={f.id}>
                          <div className={styles.framePreviewAvatar}>
                            {user.photoURL ? (
                              <img src={user.photoURL} alt="" />
                            ) : (
                              (user.displayName || user.email || '?').charAt(0).toUpperCase()
                            )}
                          </div>
                        </AvatarFrame>
                      </div>
                      <span className={styles.frameLabel}>{f.label}</span>
                    </button>
                  ))}
                </div>

                <button type="button" className={styles.saveBtn} onClick={handleSaveProfile} disabled={savingProfile} style={{ marginTop: 20 }}>
                  <Save size={15} />
                  {savingProfile ? 'Salvando…' : 'Salvar moldura'}
                </button>
              </div>

              <div className={styles.card}>
              <div className={styles.cardTitle}>Informações do perfil</div>
              <div className={styles.cardSub}>
                Como seu perfil aparece pra outras pessoas no Riffnote.
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Username</label>
                <Input
                  value={form.username}
                  onChange={(e) => updateField('username', e.target.value.replace(/\s/g, ''))}
                  placeholder="seunome"
                />
              </div>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>Nome</label>
                  <Input
                    value={form.givenName}
                    onChange={(e) => updateField('givenName', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Sobrenome</label>
                  <Input
                    value={form.familyName}
                    onChange={(e) => updateField('familyName', e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>Localização</label>
                  <Input
                    value={form.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    placeholder="Cidade, país"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Website</label>
                  <Input
                    value={form.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="https://…"
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Pronome
                  <span className={styles.labelHelp}>usado nas frases de atividade</span>
                </label>
                <Select
                  value={form.pronoun}
                  onChange={(value) => updateField('pronoun', value)}
                  options={PRONOUN_OPTIONS}
                  style={{ width: '100%' }}
                />
                <span className={styles.helpText}>
                  Exemplo de uso: "CiaoCiao adicionou Pride à watchlist {form.pronoun ? `(${form.pronoun})` : 'dele(a)'}."
                </span>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Bio</label>
                <Input.TextArea
                  value={form.bio}
                  onChange={(e) => updateField('bio', e.target.value.slice(0, 280))}
                  autoSize={{ minRows: 3, maxRows: 6 }}
                  maxLength={280}
                  placeholder="Conta um pouco sobre seus gostos musicais…"
                />
              </div>

              <button type="button" className={styles.saveBtn} onClick={handleSaveProfile} disabled={savingProfile}>
                <Save size={15} />
                {savingProfile ? 'Salvando…' : 'Salvar alterações'}
              </button>
              </div>
            </>
          )}

          {/* ---------------- CONTA ---------------- */}
          {section === 'conta' && (
            <>
              <div className={styles.card}>
                <div className={styles.cardTitle}>
                  <Mail size={16} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} />
                  Endereço de e-mail
                </div>
                <div className={styles.cardSub}>Usado pra login e recuperação de conta.</div>

                <div className={styles.currentValue}>
                  {user.email}
                  {user.emailVerified && <span className={styles.verifiedBadge}>verificado</span>}
                </div>

                <button
                  type="button"
                  className={styles.toggleLink}
                  onClick={() => setEmailFormOpen((v) => !v)}
                >
                  {emailFormOpen ? 'Cancelar' : 'Trocar e-mail'}
                </button>

                {emailFormOpen && (
                  <div className={styles.subForm}>
                    <div className={styles.field}>
                      <label className={styles.label}>Novo e-mail</label>
                      <Input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="novo@email.com"
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Confirma sua senha atual</label>
                      <Input.Password
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                      />
                    </div>
                    {emailError && <div className={styles.errorText}>{emailError}</div>}
                    <button
                      type="button"
                      className={styles.saveBtn}
                      onClick={handleChangeEmail}
                      disabled={savingEmail}
                    >
                      <Mail size={15} />
                      {savingEmail ? 'Enviando…' : 'Enviar confirmação'}
                    </button>
                    <p className={styles.helpText} style={{ marginTop: 10 }}>
                      Por segurança, você vai receber um link no novo e-mail — a troca só se
                      completa depois que você clicar nele.
                    </p>
                  </div>
                )}
              </div>

              <div className={styles.card}>
                <div className={styles.cardTitle}>
                  <KeyRound size={16} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} />
                  Senha
                </div>
                <div className={styles.cardSub}>Recomendado trocar periodicamente.</div>

                <button
                  type="button"
                  className={styles.toggleLink}
                  onClick={() => setPasswordFormOpen((v) => !v)}
                >
                  {passwordFormOpen ? 'Cancelar' : 'Trocar senha'}
                </button>

                {passwordFormOpen && (
                  <div className={styles.subForm}>
                    <div className={styles.field}>
                      <label className={styles.label}>Senha atual</label>
                      <Input.Password
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Nova senha</label>
                      <Input.Password
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="mínimo 6 caracteres"
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Confirma a nova senha</label>
                      <Input.Password
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    {passwordError && <div className={styles.errorText}>{passwordError}</div>}
                    <button
                      type="button"
                      className={styles.saveBtn}
                      onClick={handleChangePassword}
                      disabled={savingPassword}
                    >
                      <KeyRound size={15} />
                      {savingPassword ? 'Salvando…' : 'Trocar senha'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ---------------- PRIVACIDADE ---------------- */}
          {section === 'privacidade' && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>Quem pode responder seu conteúdo</div>
              <div className={styles.cardSub}>
                Controla quem pode comentar nas suas resenhas, listas e atividades.
              </div>

              <div className={styles.radioGroup}>
                {REPLY_OPTIONS.map((opt) => (
                  <div
                    key={opt.value}
                    className={`${styles.radioOption} ${
                      repliesPermission === opt.value ? styles.radioOptionActive : ''
                    }`}
                    onClick={() => setRepliesPermission(opt.value)}
                  >
                    <span
                      className={`${styles.radioDot} ${
                        repliesPermission === opt.value ? styles.radioDotActive : ''
                      }`}
                    />
                    <div>
                      <div className={styles.radioLabel}>{opt.label}</div>
                      <div className={styles.radioDesc}>{opt.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSavePrivacy}
                disabled={savingPrivacy}
                style={{ marginTop: 20 }}
              >
                <Save size={15} />
                {savingPrivacy ? 'Salvando…' : 'Salvar preferências'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}