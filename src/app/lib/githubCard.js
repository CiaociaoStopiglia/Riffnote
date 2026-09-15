// src/app/lib/githubCard.js
// Gera o "cartão" de perfil (estilo devcard) pra colocar no README do GitHub:
// nome em destaque à esquerda + card vermelho com avatar e stats à direita.

const WIDTH = 1200;
const HEIGHT = 460;
const SCALE = 2; // renderiza em @2x pra ficar nítido quando embutido no README

const RED_DARK = '#6e0f1a';
const RED = '#b3121f';
const RED_LIGHT = '#e2483a';
const CREAM = '#f4efe6';
const INK = '#18141a';
const INK_MUTED = '#7a7480';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawRoundedRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Desenha a imagem cortada (object-fit: cover), sem esticar/achatar o conteúdo. */
function drawImageCover(ctx, img, x, y, w, h) {
  const targetRatio = w / h;
  const imgRatio = img.width / img.height;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (imgRatio > targetRatio) {
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / targetRatio;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawPanelPattern(ctx, x, y, w, h, radius) {
  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, radius);
  ctx.clip();

  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth = 1.4;
  const size = 34;
  for (let row = -1; row * size < h + size; row++) {
    for (let col = -1; col * size < w + size; col++) {
      const cx = x + col * size + (row % 2 === 0 ? 0 : size / 2);
      const cy = y + row * size;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-6, -6, 12, 12);
      ctx.restore();
    }
  }
  ctx.restore();
}

function formatDuration(createdAt) {
  if (!createdAt) return 'novo(a)';

  const start = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const days = Math.floor((Date.now() - start.getTime()) / 86400000);

  if (days < 1) return 'hoje';
  if (days < 30) return `${days}d`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? 'mês' : 'meses'}`;

  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'ano' : 'anos'}`;
}

function wrapText(ctx, text, maxWidth, maxLines) {
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
    if (lines.length === maxLines - 1) break;
  }
  if (current) lines.push(current);

  if (lines.length > maxLines) {
    lines.length = maxLines;
  } else if (lines.length === maxLines) {
    const consumedWords = lines.join(' ').split(' ').length;
    const remaining = words.slice(consumedWords).join(' ');
    if (remaining) {
      let last = lines[maxLines - 1];
      while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = `${last}…`;
    }
  }

  return lines;
}

function drawStatColumn(ctx, cx, top, icon, value, label) {
  ctx.textAlign = 'center';

  ctx.font = '26px sans-serif';
  ctx.fillText(icon, cx, top);

  ctx.fillStyle = CREAM;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(value, cx, top + 40);

  ctx.fillStyle = 'rgba(244,239,230,0.62)';
  ctx.font = '15px sans-serif';
  ctx.fillText(label, cx, top + 64);
}

/**
 * Desenha o cartão num canvas e devolve o Blob PNG pronto pra download.
 * profile: { username, displayName, photoURL, ratingsCount, followersCount, createdAt }
 */
export async function generateGithubCardBlob(profile) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * SCALE;
  canvas.height = HEIGHT * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // fundo
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ---------- card colorido, à direita ----------
  const panelW = 620;
  const panelH = 330;
  const panelX = WIDTH - 40 - panelW;
  const panelY = (HEIGHT - panelH) / 2 + 15;
  const panelRadius = 32;

  // ---------- bloco de texto, à esquerda ----------
  const textX = 64;
  const textMaxWidth = panelX - textX - 40;
  const name = profile.displayName || `@${profile.username || 'usuario'}`;

  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = 'bold 68px sans-serif';
  const nameLines = wrapText(ctx, name, textMaxWidth, 2);
  const lineHeight = 74;
  const nameBlockHeight = nameLines.length * lineHeight;
  const blockTop = HEIGHT / 2 - nameBlockHeight / 2 - 30;

  nameLines.forEach((line, i) => {
    ctx.fillText(line, textX, blockTop + (i + 1) * lineHeight - 18);
  });

  ctx.fillStyle = INK_MUTED;
  ctx.font = '28px sans-serif';
  const usernameY = blockTop + nameBlockHeight + 32;
  ctx.fillText(`@${profile.username || 'usuario'}`, textX, usernameY);

  ctx.strokeStyle = 'rgba(24,20,26,0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(textX, usernameY + 34);
  ctx.lineTo(textX + Math.min(textMaxWidth, 420), usernameY + 34);
  ctx.stroke();

  ctx.fillStyle = INK_MUTED;
  ctx.font = '22px sans-serif';
  ctx.fillText('www.riffnote.com.br', textX, usernameY + 72);

  const bg = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY + panelH);
  bg.addColorStop(0, RED_DARK);
  bg.addColorStop(0.55, RED);
  bg.addColorStop(1, RED_LIGHT);
  drawRoundedRect(ctx, panelX, panelY, panelW, panelH, panelRadius);
  ctx.fillStyle = bg;
  ctx.fill();

  drawPanelPattern(ctx, panelX, panelY, panelW, panelH, panelRadius);

  // barra escura de stats, dentro do card
  const barMargin = 24;
  const barHeight = 118;
  const barX = panelX + barMargin;
  const barY = panelY + panelH - barHeight - barMargin;
  const barWidth = panelW - barMargin * 2;

  ctx.save();
  drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 20);
  ctx.fillStyle = 'rgba(12,10,11,0.55)';
  ctx.fill();
  ctx.restore();

  const stats = [
    { icon: '💿', value: String(profile.ratingsCount || 0), label: 'discos avaliados' },
    { icon: '👥', value: String(profile.followersCount || 0), label: 'seguidores' },
    { icon: '⏳', value: formatDuration(profile.createdAt), label: 'no Riffnote' },
  ];
  const colWidth = barWidth / stats.length;
  stats.forEach((stat, i) => {
    const cx = barX + colWidth * i + colWidth / 2;
    drawStatColumn(ctx, cx, barY + 40, stat.icon, stat.value, stat.label);
  });

  // avatar, "vazando" por cima do card
  const avatarSize = 150;
  const avatarX = panelX + 36;
  const avatarY = panelY - 52;
  const borderWidth = 7;
  const avatarRadius = 30;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  drawRoundedRect(ctx, avatarX - borderWidth, avatarY - borderWidth, avatarSize + borderWidth * 2, avatarSize + borderWidth * 2, avatarRadius + borderWidth);
  ctx.fillStyle = CREAM;
  ctx.fill();
  ctx.restore();

  if (profile.photoURL) {
    try {
      const proxied = `/api/proxy-image?url=${encodeURIComponent(profile.photoURL)}`;
      const img = await loadImage(proxied);
      ctx.save();
      drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, avatarRadius);
      ctx.clip();
      drawImageCover(ctx, img, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } catch (err) {
      ctx.save();
      drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, avatarRadius);
      ctx.fillStyle = RED_DARK;
      ctx.fill();
      ctx.restore();
    }
  } else {
    ctx.save();
    drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, avatarRadius);
    ctx.fillStyle = RED_DARK;
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CREAM;
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText((profile.username || '?').charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 4);
    ctx.restore();
  }
  ctx.textBaseline = 'alphabetic';

  // selinho da marca, no canto inferior direito do card
  const pillW = 176;
  const pillH = 52;
  const pillX = panelX + panelW - pillW - 22;
  const pillY = panelY + panelH - pillH / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = CREAM;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('🎵 riffnote', pillX + pillW / 2, pillY + pillH / 2 + 8);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

/** Gera o cartão e devolve um object URL pronto pra usar num <img>/<canvas> de preview. */
export async function generateGithubCardPreviewUrl(profile) {
  const blob = await generateGithubCardBlob(profile);
  return URL.createObjectURL(blob);
}

/** Gera o cartão e dispara o download como PNG. */
export async function downloadGithubCard(profile) {
  const blob = await generateGithubCardBlob(profile);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `riffnote-${profile.username || 'cartao'}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
