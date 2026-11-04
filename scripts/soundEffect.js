export default async function playSound(action) {
  const audio  = new Audio(`/sounds/${action}.wav`);
  await audio.play();
}