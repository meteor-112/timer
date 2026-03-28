import Swal from 'sweetalert2';

// 建立一個自定義樣式的 Swal 實例
export const MySwal = Swal.mixin({
  customClass: {
    confirmButton:
      'bg-gray-700 border-2 border-stone-700 text-stone-200 px-6 py-2 rounded-xl mx-2 hover:bg-gray-800 transition-all active:scale-95 cursor-pointer',
    cancelButton:
      'bg-white border-2 border-stone-700 text-stone-700 px-6 py-2 rounded-xl mx-2 hover:bg-stone-100 transition-all cursor-pointer',
    popup: 'rounded-2xl border-none shadow-xl',
  },
  buttonsStyling: false, // 禁用原生樣式以套用 Tailwind
});

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
