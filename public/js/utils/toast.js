function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `
    flex items-center gap-2 px-4 py-2 mb-2 rounded-md shadow-lg text-sm
    transform translate-x-full opacity-0 transition-all duration-500 ease-out
    ${type === "success" ? "bg-gray-800 border border-green-500 text-green-400" :
      type === "error"   ? "bg-gray-800 border border-red-500 text-red-400" :
                           "bg-gray-800 border border-blue-500 text-blue-400"}
  `;

  const icon = document.createElement("span");
  icon.innerHTML = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";

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
    setTimeout(() => toast.remove(), 500);
  }, 4200);
}
