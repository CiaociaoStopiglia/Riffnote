// src/app/lib/cloudinary.js
import axios from 'axios';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Sobe uma imagem pro Cloudinary direto do navegador (upload "unsigned" —
 * não precisa de backend nem de chave secreta exposta).
 * Retorna a URL segura (https) da imagem já hospedada.
 */
export async function uploadImage(file, folder = 'riffnote') {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary não configurado. Confira NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME e NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET no .env.local.'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const { data } = await axios.post(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    formData
  );

  return data.secure_url;
}

/**
 * Insere uma transformação de entrega (formato + qualidade automáticos) na
 * URL do Cloudinary. Não reduz a resolução — só faz o Cloudinary escolher o
 * formato mais eficiente (ex: WebP/AVIF quando o navegador aceita) e a
 * melhor qualidade sem desperdiçar bytes à toa.
 */
export function optimizeCloudinaryUrl(url, transform = 'f_auto,q_auto:best') {
  if (!url || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/${transform}/`);
}

/**
 * Confere se uma imagem é "larga o bastante" pro formato do banner do
 * perfil (bem panorâmico). Fotos estreitas/retrato precisam esticar muito
 * pra cobrir essa faixa, e isso borra — aqui a gente avisa antes de subir.
 */
export function checkImageAspectRatio(file, minRatio = 2.2) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ ratio: img.width / img.height, wide: img.width / img.height >= minRatio });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ ratio: null, wide: true }); // não bloqueia se não conseguir medir
    };
    img.src = url;
  });
}