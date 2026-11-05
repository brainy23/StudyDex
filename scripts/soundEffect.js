export default async function playSound(action) {
  const audio = new Audio(`/sounds/${action}.wav`);
  if (action === 'bossfight'){
    audio.loop = true;
  }
  try { await audio.play(); } catch { /* Sound is optional when playback is blocked. */ }
}
