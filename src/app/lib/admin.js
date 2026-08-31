// src/app/lib/admin.js

// Lista de e-mails com privilégios/visual especial de administrador.
export const ADMIN_EMAILS = ['joao.stopiglia4@gmail.com'];
export const FIRST_MEMBER_EMAILS = ['gustavo.v.ferreira12@aluno.senai.br'];

export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(email);
}

export function isFirstMemberEmail(email) {
  return !!email && FIRST_MEMBER_EMAILS.includes(email);
}

export function getProfileBadge(email) {
  if (isAdminEmail(email)) return 'ADM';
  if (isFirstMemberEmail(email)) return 'First Member';
  return null;
}
