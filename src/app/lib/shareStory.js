// src/app/lib/shareStory.js

const WIDTH = 1080;
const HEIGHT = 1920;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawRoundedImage(ctx, img, x, y, w, h, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

function drawStar(ctx, cx, cy, size, fillRatio) {
  const spikes = 5;
  const outerR = size;
  const innerR = size * 0.42;

  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  ctx.fillStyle = '#3a3640';
  ctx.fill();

  if (fillRatio > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - outerR, cy - outerR, outerR * 2 * fillRatio, outerR * 2);
    ctx.clip();
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI / spikes) * i - Math.PI / 2;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#e8963c';
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Gera a imagem de compartilhamento (capa + nota + resenha) como um Blob
 * PNG no formato 9:16, pronto pro Instagram Stories.
 */
export async function generateStoryImage(album, rating, review) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  // fundo
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, '#17151a');
  bg.addColorStop(1, '#0b0a0d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // grão sutil de fundo
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  for (let i = 0; i < 400; i++) {
    ctx.fillRect(Math.random() * WIDTH, Math.random() * HEIGHT, 2, 2);
  }

  // capa do álbum, via proxy (evita canvas "contaminado")
  const coverSize = 760;
  const coverX = (WIDTH - coverSize) / 2;
  const coverY = 300;

  if (album.artwork) {
    try {
      const proxied = `/api/proxy-image?url=${encodeURIComponent(album.artwork)}`;
      const img = await loadImage(proxied);
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 60;
      ctx.shadowOffsetY = 20;
      drawRoundedImage(ctx, img, coverX, coverY, coverSize, coverSize, 24);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    } catch (err) {
      ctx.fillStyle = '#242028';
      ctx.fillRect(coverX, coverY, coverSize, coverSize);
    }
  } else {
    ctx.fillStyle = '#242028';
    ctx.fillRect(coverX, coverY, coverSize, coverSize);
  }

  // título do álbum
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f4efe6';
  ctx.font = '700 56px system-ui, -apple-system, sans-serif';
  const titleY = coverY + coverSize + 100;
  const titleLines = wrapText(ctx, album.title, WIDTH - 160);
  titleLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2, titleY + i * 66);
  });

  // artista
  ctx.fillStyle = '#a89f92';
  ctx.font = '500 38px system-ui, -apple-system, sans-serif';
  const artistY = titleY + titleLines.slice(0, 2).length * 66 + 20;
  ctx.fillText(album.artist, WIDTH / 2, artistY);

  // estrelas
  const starsY = artistY + 90;
  const starSize = 34;
  const gap = 20;
  const totalWidth = starSize * 2 * 5 + gap * 4;
  const startX = WIDTH / 2 - totalWidth / 2 + starSize;
  for (let i = 0; i < 5; i++) {
    const fillRatio = Math.max(0, Math.min(1, rating - i));
    drawStar(ctx, startX + i * (starSize * 2 + gap), starsY, starSize, fillRatio);
  }

  ctx.fillStyle = '#e8963c';
  ctx.font = '700 34px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${rating.toFixed(1)}/5`, WIDTH / 2, starsY + 76);

  // resenha (se houver)
  if (review) {
    ctx.fillStyle = '#a89f92';
    ctx.font = 'italic 32px system-ui, -apple-system, sans-serif';
    const reviewLines = wrapText(ctx, `"${review}"`, WIDTH - 200).slice(0, 4);
    const reviewStartY = starsY + 150;
    reviewLines.forEach((line, i) => {
      ctx.fillText(line, WIDTH / 2, reviewStartY + i * 44);
    });
  }

  // marca Riffnote
  ctx.fillStyle = '#f4efe6';
  ctx.font = '800 40px system-ui, -apple-system, sans-serif';
  ctx.fillText('RIFFNOTE', WIDTH / 2, HEIGHT - 120);
  ctx.fillStyle = '#6f6860';
  ctx.font = '400 26px system-ui, -apple-system, sans-serif';
  ctx.fillText('diário de escuta pessoal', WIDTH / 2, HEIGHT - 76);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

/**
 * Compartilha a imagem via API nativa do navegador (abre o menu de
 * compartilhar do celular, onde o Instagram já aparece como opção pra
 * Stories) — sem precisar de login nem autorização da Meta. Se o
 * navegador não suportar, baixa a imagem como plano B.
 */
export async function shareStoryImage(album, rating, review) {
  const blob = await generateStoryImage(album, rating, review);
  const file = new File([blob], 'riffnote-avaliacao.png', { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: `${album.title} no Riffnote`,
    });
    return 'shared';
  }

  // plano B: baixa a imagem pra pessoa subir manualmente
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'riffnote-avaliacao.png';
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}