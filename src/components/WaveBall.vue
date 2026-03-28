<!-- 聲波球 -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';

interface Props {
  isRunning: boolean;
  size?: number;
}

const props = withDefaults(defineProps<Props>(), {
  isRunning: false,
  size: 320,
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const padding = 20;
let animId: number = 0;
let time = 0;

// 計算實際畫布尺寸 (含留白)
const canvasSize = computed(() => props.size + padding * 2);
/**
 * 核心繪製邏輯
 */
const draw = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { size, isRunning } = props;
  const currentCanvasSize = canvasSize.value;

  // 處理高解析度螢幕 (Retina)
  const dpr = window.devicePixelRatio || 1;
  canvas.width = currentCanvasSize * dpr;
  canvas.height = currentCanvasSize * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, currentCanvasSize, currentCanvasSize);

  // 計算中心點與半徑
  const cx = currentCanvasSize / 2;
  const cy = currentCanvasSize / 2;
  const r = size / 2 - 8;

  // 1. 繪製外層發光效果 (Glow)
  const glow = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r + 10);
  glow.addColorStop(0, 'hsla(160, 12%, 65%, 0.0)');
  glow.addColorStop(0.7, 'hsla(160, 12%, 65%, 0.05)');
  glow.addColorStop(1, 'hsla(160, 12%, 65%, 0.15)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
  ctx.fill();

  // 2. 繪製圓形邊框 (Circle border)
  ctx.strokeStyle = 'hsla(160, 12%, 65%, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  const highlight = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, 0, cx - r * 0.35, cy - r * 0.35, r * 0.5);
  highlight.addColorStop(0, 'hsla(0, 0%, 100%, 0.45)');
  highlight.addColorStop(1, 'hsla(0, 0%, 100%, 0)');
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // 3. 內層填充 (Inner fill)
  const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  innerGrad.addColorStop(0, 'hsla(160, 12%, 65%, 0.08)');
  innerGrad.addColorStop(1, 'hsla(160, 12%, 65%, 0.02)');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // 4. 繪製波浪 (Draw wave)
  if (isRunning) {
    time += 0.03;
  }
  const t = time;
  const amplitude = isRunning ? 12 + Math.sin(t * 0.5) * 6 : 4;
  const waveCount = 3;

  ctx.save();
  // 建立圓形剪裁區域，確保波浪不超出邊界
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.clip();

  for (let i = 0; i < waveCount; i++) {
    const offset = i * 1.2;
    const alpha = 0.15 + i * 0.08;
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);

    // 生成波浪曲線
    for (let x = -r; x <= r; x += 1) {
      const normalX = x / r;
      const waveY =
        Math.sin(normalX * Math.PI * 2 + t * 2 + offset) * amplitude * 0.6 +
        Math.sin(normalX * Math.PI * 3 + t * 1.5 + offset * 2) * amplitude * 0.4;
      ctx.lineTo(cx + x, cy + waveY);
    }

    // 封閉路徑以填充顏色
    ctx.lineTo(cx + r, cy + r + 10);
    ctx.lineTo(cx - r, cy + r + 10);
    ctx.closePath();
    ctx.fillStyle = `hsla(160, 12%, 65%, ${alpha})`;
    ctx.fill();
  }
  ctx.restore();

  // 持續循環
  animId = requestAnimationFrame(draw);
};

// 生命週期管理
onMounted(() => {
  animId = requestAnimationFrame(draw);
});

onUnmounted(() => {
  if (animId) {
    cancelAnimationFrame(animId);
  }
});

/**
 * 技巧：雖然 draw 內會讀取最新的 props，
 * 但如果 size 改變，Canvas 需要重新繪製，這由 requestAnimationFrame 自動處理。
 */
</script>

<template>
  <canvas ref="canvasRef" :style="{ width: `${size}px`, height: `${size}px` }" class="animate-float" />
</template>

<style scoped>
/* 這裡可以放置原本 CSS 中的 animate-float 定義，若全局已定義則免 */
.animate-float {
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}
</style>
