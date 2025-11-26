export function applyTransitionEffect(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  transition: string,
  currentTime: number,
  clipStart: number,
  clipEnd: number,
  transitionDuration: number = 0.5,
) {
  if (transition === 'none') return;

  const elapsedTime = currentTime - clipStart;
  const totalDuration = clipEnd - clipStart;
  const transitionStartTime = totalDuration - transitionDuration;
  
  // Only apply transition in the last transitionDuration seconds
  if (elapsedTime < transitionStartTime) return;

  const transitionProgress = Math.min(1, (elapsedTime - transitionStartTime) / transitionDuration);
  
  ctx.save();

  switch (transition) {
    case 'fade':
      ctx.globalAlpha = 1 - transitionProgress;
      break;
    case 'slideLeft':
      ctx.translate(-canvas.width * transitionProgress, 0);
      break;
    case 'slideRight':
      ctx.translate(canvas.width * transitionProgress, 0);
      break;
    case 'zoomIn':
      const zoomScale = 1 + transitionProgress * 0.3;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      break;
    case 'zoomOut':
      const zoomOutScale = 1 - transitionProgress * 0.3;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(zoomOutScale, zoomOutScale);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      break;
    case 'dissolve':
      ctx.globalAlpha = Math.max(0, 1 - transitionProgress * 1.5);
      break;
    case 'wipeDown':
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height * (1 - transitionProgress));
      ctx.clip();
      break;
    case 'wipeUp':
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, canvas.height * transitionProgress, canvas.width, canvas.height);
      ctx.clip();
      break;
  }
}

export function resetTransitionEffect(ctx: CanvasRenderingContext2D, transition: string) {
  ctx.restore();
}
