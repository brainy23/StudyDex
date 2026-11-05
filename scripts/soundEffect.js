export default async function playSound(action) {
  const audio  = new Audio(`/sounds/${action}.wav`);
  if (action === 'bossfight'){
    audio.loop = true;
  }
  await audio.play();
}