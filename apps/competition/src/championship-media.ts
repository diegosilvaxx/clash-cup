import type { Championship } from '@clash-cup/competitions';
import { artwork, shellUrl } from '@clash-cup/ui';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
    image.src = src;
  });
}
export async function prepareCover(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024)
    throw new Error('Escolha uma imagem JPG, PNG ou WebP de até 8 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Seu navegador não conseguiu preparar a imagem.');
    ctx.fillStyle = '#0a172b';
    ctx.fillRect(0, 0, 1000, 500);
    const scale = Math.max(1000 / image.naturalWidth, 500 / image.naturalHeight);
    ctx.drawImage(
      image,
      (1000 - image.naturalWidth * scale) / 2,
      (500 - image.naturalHeight * scale) / 2,
      image.naturalWidth * scale,
      image.naturalHeight * scale,
    );
    for (const quality of [0.8, 0.65, 0.5, 0.35]) {
      const result = canvas.toDataURL('image/jpeg', quality);
      if (result.length <= 200000) return result;
    }
    throw new Error('A imagem tem muitos detalhes. Escolha uma versão mais simples.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function championshipUrl(id: string) {
  const path = `/campeonatos/${encodeURIComponent(id)}`;
  return import.meta.env.PROD ? new URL(path, window.location.origin).href : shellUrl(path);
}
export async function downloadPoster(item: Championship, champion: string | null) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não permite gerar a imagem.');
  ctx.fillStyle = '#080f1e';
  ctx.fillRect(0, 0, 1080, 1350);
  const image = await loadImage(item.cover || artwork.landscape);
  const scale = Math.max(1080 / image.naturalWidth, 1350 / image.naturalHeight);
  ctx.drawImage(
    image,
    (1080 - image.naturalWidth * scale) / 2,
    0,
    image.naturalWidth * scale,
    image.naturalHeight * scale,
  );
  const gradient = ctx.createLinearGradient(0, 150, 0, 1200);
  gradient.addColorStop(0, '#080f1e22');
  gradient.addColorStop(0.7, '#080f1eee');
  gradient.addColorStop(1, '#080f1e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 3;
  ctx.strokeRect(32, 32, 1016, 1286);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 34px Segoe UI';
  ctx.fillStyle = '#081326dd';
  ctx.fillRect(400, 56, 280, 64);
  ctx.fillStyle = '#ffd166';
  ctx.fillText('CLASH CUP', 540, 100);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 76px Impact, Segoe UI';
  ctx.shadowColor = '#000000aa';
  ctx.shadowBlur = 16;
  const words = item.name.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > 900 && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  lines.slice(0, 4).forEach((text, index) => ctx.fillText(text, 540, 460 + index * 85, 900));
  ctx.shadowBlur = 0;
  const y = 500 + Math.min(lines.length, 4) * 85;
  ctx.font = '30px Segoe UI';
  ctx.fillStyle = '#b7cee9';
  ctx.fillText(`${item.size} JOGADORES  •  MELHOR DE ${item.bestOf}`, 540, y);
  if (item.startsAt)
    ctx.fillText(
      new Date(item.startsAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      540,
      y + 56,
    );
  const trophy = await loadImage(artwork.trophy);
  const trophyY = y + (item.startsAt ? 86 : 46);
  const trophyScale = Math.min(
    230 / trophy.naturalWidth,
    Math.min(230, 1080 - trophyY) / trophy.naturalHeight,
  );
  ctx.drawImage(
    trophy,
    540 - (trophy.naturalWidth * trophyScale) / 2,
    trophyY,
    trophy.naturalWidth * trophyScale,
    trophy.naturalHeight * trophyScale,
  );
  ctx.fillStyle = '#0b3d71';
  ctx.fillRect(90, 1080, 900, 88);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 38px Segoe UI';
  ctx.fillText(champion ? `CAMPEÃO: ${champion}` : 'ACOMPANHE OS CONFRONTOS', 540, 1130, 900);
  ctx.fillStyle = '#b7cee9';
  ctx.font = '22px Segoe UI';
  ctx.fillText(championshipUrl(item.id), 540, 1220, 900);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.92),
  );
  if (!blob) throw new Error('Não foi possível gerar a arte.');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'clash-cup-campeonato.jpg';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
