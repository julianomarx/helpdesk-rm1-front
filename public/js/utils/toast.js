function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const icons = {
    success: `<svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
    </svg>`,
    error: `<svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
    </svg>`,
    info: `<svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z"/>
    </svg>`,
  };

  const toast = document.createElement("div");
  toast.className = [
    "flex items-center gap-2 px-4 py-2.5 mb-2 rounded-lg shadow-xl text-sm font-medium",
    "transform translate-x-full opacity-0 transition-all duration-300 ease-out",
    type === "success" ? "bg-gray-900 border border-green-500/50 text-green-400" :
    type === "error"   ? "bg-gray-900 border border-red-500/50 text-red-400" :
                         "bg-gray-900 border border-blue-500/50 text-blue-400",
  ].join(" ");

  const icon = document.createElement("span");
  icon.innerHTML = icons[type] || icons.info;

  const text = document.createElement("span");
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove("translate-x-full", "opacity-0");
    toast.classList.add("translate-x-0", "opacity-100");
  });

  setTimeout(() => {
    toast.classList.remove("translate-x-0", "opacity-100");
    toast.classList.add("opacity-0", "translate-x-full");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
