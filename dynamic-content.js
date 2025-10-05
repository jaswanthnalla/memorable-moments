// Keeps admin-driven hero title in sync
export function updateHeroTitle(text) {
  const title = document.getElementById('text-pressure-title');
  if (!title) return;
  // Replace existing spans and reinitialize pressure animation
  title.textContent = text || '';
  // Note: The inline script on index.html will rebuild spans on load.
}
