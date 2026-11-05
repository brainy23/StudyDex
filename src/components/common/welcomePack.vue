<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getUnopenedWelcomePack } from '../../services/welcomepackService'

const props = defineProps({
  userId: { type: String, default: null },
  // Change to the route where users open their packs
//   packRoute: { type: String, default: 'packs' },
})

const router = useRouter()
const visible = ref(false)
const pack = ref(null)
const seenKey = () => `studydex-welcome-pack-seen-v1:${props.userId}`

function alreadySeen() {
  try { return localStorage.getItem(seenKey()) === '1' } catch { return false }
}
function markSeen() {
  try { localStorage.setItem(seenKey(), '1') } catch { /* shown again next visit */ }
}

watch(() => props.userId, async (id, _, onCleanup) => {
  let cancelled = false
  onCleanup(() => { cancelled = true })
  visible.value = false
  if (!id || alreadySeen()) return
  try {
    const found = await getUnopenedWelcomePack(id)
    if (cancelled || !found) return
    pack.value = found
    visible.value = true
  } catch { /* no popup if the check fails; the pack is still in the pack list */ }
}, { immediate: true })

function later() {
  markSeen()
  visible.value = false
}
async function openNow() {
  markSeen()
  visible.value = false
  try { await router.push('/rewards') }
  catch (e) { console.error('[welcome] could not open rewards:', e) }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="wp-backdrop" @keydown.esc="later">
      <div class="wp-card" role="dialog" aria-modal="true" aria-labelledby="wp-title">
        <div class="wp-pack" aria-hidden="true">🎁</div>
        <h2 id="wp-title">Welcome to Studydex!</h2>
        <p>
          You have a <strong>free welcome pack</strong> waiting.
          Open it to meet your first Pokémon study buddy!
        </p>
        <div class="wp-actions">
          <button type="button" class="wp-primary" autofocus @click="openNow">Open my pack</button>
          <button type="button" class="wp-secondary" @click="later">Maybe later</button>
        </div>
        <small>You can find it any time in your packs.</small>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.wp-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  display: grid; place-items: center; padding: 16px;
  background: rgb(10 15 35 / .72);
}
.wp-card {
  box-sizing: border-box; width: min(420px, 100%);
  padding: 28px 24px 20px; text-align: center;
  border: 3px solid #263b5c; border-radius: 18px;
  background: #fffdf3; color: #243653;
  font-family: 'Fredoka', system-ui, sans-serif;
  box-shadow: 0 6px 0 #263b5c55;
  animation: wp-pop .35s ease-out;
}
.wp-pack { font-size: 64px; line-height: 1; animation: wp-bob 1.6s ease-in-out infinite; }
.wp-card h2 { margin: 12px 0 8px; font-size: 24px; font-weight: 800; }
.wp-card p { margin: 0 0 18px; font-size: 16px; line-height: 1.4; }
.wp-actions { display: flex; flex-direction: column; gap: 8px; }
.wp-actions button {
  padding: 12px 16px; border-radius: 12px; font: inherit; font-weight: 700; cursor: pointer;
}
.wp-primary { border: 2px solid #263b5c; background: #f4c542; color: #263b5c; }
.wp-secondary { border: 2px solid transparent; background: transparent; color: #4b5d78; }
.wp-card small { display: block; margin-top: 12px; color: #697386; font-size: 12px; }
@keyframes wp-pop { from { transform: scale(.85); opacity: 0 } to { transform: scale(1); opacity: 1 } }
@keyframes wp-bob { 50% { transform: translateY(-8px) } }
@media (prefers-reduced-motion: reduce) {
  .wp-card, .wp-pack { animation: none; }
}
</style>