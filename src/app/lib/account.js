// src/app/lib/account.js
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
  updatePassword,
} from 'firebase/auth';
import { auth } from './firebase';

/**
 * O Firebase exige que a pessoa tenha logado "recentemente" pra fazer
 * qualquer alteração sensível (trocar e-mail ou senha). Se a sessão for
 * antiga, essas chamadas falham com auth/requires-recent-login — por isso
 * sempre reautenticamos com a senha atual antes.
 */
async function reauthenticate(currentPassword) {
  const user = auth.currentUser;
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
}

/**
 * Troca de e-mail: por segurança, o Firebase não troca na hora — ele manda
 * um link de confirmação pro NOVO e-mail, e só troca depois que a pessoa
 * clica nesse link.
 */
export async function changeEmail(newEmail, currentPassword) {
  await reauthenticate(currentPassword);
  await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
}

export async function changePassword(currentPassword, newPassword) {
  await reauthenticate(currentPassword);
  await updatePassword(auth.currentUser, newPassword);
}
