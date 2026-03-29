import Swal from 'sweetalert2';

// 建立一個自定義樣式的 Swal 實例
export const MySwal = Swal.mixin({
  customClass: {
    confirmButton:
      'bg-gray-700 border-2 border-stone-700 text-stone-200 px-6 py-2 rounded-xl mx-2 hover:bg-gray-800 transition-all active:scale-95 cursor-pointer',
    cancelButton:
      'bg-white border-2 border-stone-700 text-stone-700 px-6 py-2 rounded-xl mx-2 hover:bg-stone-100 transition-all cursor-pointer',
    popup: 'timer-swal-popup rounded-2xl border-none shadow-xl',
  },
  buttonsStyling: false, // 禁用原生樣式以套用 Tailwind
});

export type TimerCompletionItem = { kind: 'fragment' | 'unlock'; fragmentId: string };

/** 專注完成：依序顯示恭喜、碎片與解鎖；可選在每則獎勵彈窗前先播放音效 */
export async function runTimerCompletionAlerts(
  minutes: number,
  items: TimerCompletionItem[],
  ctx: {
    getFragmentLabel: (id: string) => string;
    beforeEachReward?: (item: TimerCompletionItem) => Promise<void>;
  },
): Promise<void> {
  const hasSteps = items.length > 0;
  await MySwal.fire({
    title: '恭喜！',
    html: `您已專注 ${minutes} 分鐘！`,
    confirmButtonText: hasSteps ? '繼續' : '關閉',
  });

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const isLast = i === items.length - 1;
    const label = ctx.getFragmentLabel(item.fragmentId);
    await ctx.beforeEachReward?.(item);

    if (item.kind === 'fragment') {
      await MySwal.fire({
        title: '獲得碎片',
        text: label,
        confirmButtonText: isLast ? '關閉' : '繼續',
      });
    } else {
      await MySwal.fire({
        title: '解鎖成功',
        html: `已解鎖「${label}」唱片<br/><span class="text-sm opacity-80">完整音軌已可播放</span>`,
        confirmButtonText: isLast ? '關閉' : '繼續',
      });
    }
  }
}

// Toast 通知範例
export const toast = {
  success: (title: string) => {
    MySwal.fire({
      title,
      icon: 'success',
      toast: true,
      position: 'top-end',
      timer: 3000,
      showConfirmButton: false,
    });
  },
};
