// src/app/lib/admin.js

// Lista de e-mails com privilégios/visual especial de administrador.
export const ADMIN_EMAILS = ['joao.stopiglia4@gmail.com'];

export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(email);
}
