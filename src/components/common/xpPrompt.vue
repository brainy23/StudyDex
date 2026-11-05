<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import PokeSprite from '../pokebuddy/PokeSprite.vue'

// Existing XP-result contract is preserved.
// New optional result fields:
//   reachedMaxEvolution: boolean (recommended explicit trigger)
//   evolvedToMax: boolean (alias)
//   evolved: boolean + evolution_stage: 'MAX' (alternative)
//   giftOpening: boolean
//   giftError: string
//   giftPokemon: { name, animated_img, static_img, xp, ... }
//   unallocatedXP: number (optional leftover XP display)
// The parent handles creating/saving a gift after @open-gift.
const props = defineProps({
  offerGift: { type: Boolean, default: false },
  result: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'open-gift'])

const dialog = ref(null)
const step = ref('xp') // 'xp' -> 'gift' -> 'revealed'
const evolutionSprite = ref(null)
const evolutionFinished = ref(false)
const animating = ref(false)
const evolutionError = ref('')
let animationSequence = 0
const busy = computed(() => props.result?.saving || animating.value || giftOpening.value)
const displayedPokemon = computed(() =>
  evolutionFinished.value || props.result?.duplicate || !props.result?.evolutions?.length
    ? props.result?.pokemon
    : props.result?.originalPokemon || props.result?.pokemon
)

watch([() => props.result, () => props.result?.saving], async ([result], _, onCleanup) => {
  const sequence = ++animationSequence
  let cancelled = false
  onCleanup(() => { cancelled = true })
  evolutionFinished.value = false
  evolutionError.value = ''
  animating.value = false
  if (!result || result.saving || result.error || result.duplicate || !result.evolutions?.length) return
  animating.value = true
  result.animating = true
  await nextTick()
  try {
    const played = await evolutionSprite.value?.playEvolution(result.evolutions)
    if (!played && !cancelled) evolutionError.value = 'Progress saved. The animation could not load.'
  } catch {
    if (!cancelled) evolutionError.value = 'Progress saved. The animation could not load.'
  } finally {
    result.animating = false
    if (!cancelled && sequence === animationSequence) {
      evolutionFinished.value = true
      animating.value = false
    }
  }
}, { immediate: true, flush: 'post' })

const isLoss = computed(() => (props.result?.delta ?? 0) < 0)

const hasAdjustedDeduction = computed(() => {
  const result = props.result
  return (
    result?.delta < 0 &&
    Number.isFinite(result.appliedDelta) &&
    result.appliedDelta !== result.delta
  )
})

const reachedMaxEvolution = computed(() => {
  const result = props.result

  // Never offer a gift for an unsaved, failed or duplicate XP result.
  if (!result || result.saving || result.error || result.duplicate) return false

  return (
    result.reachedMaxEvolution === true ||
    result.evolvedToMax === true ||
    (
      result.evolved === true &&
      (
        result.evolution_stage === 'MAX' ||
        result.evolutionStage === 'MAX' ||
        result.pokemon?.evolution_stage === 'MAX'
      )
    )
  )
})

const giftOpening = computed(() => Boolean(
  props.result?.giftOpening || props.result?.giftLoading
))

const giftPokemon = computed(() => props.result?.giftPokemon ?? null)
const giftError = computed(() => props.result?.giftError || '')
const leftoverXP = computed(() => {
  const xp = props.result?.unallocatedXP ?? props.result?.overflowXP
  return Number.isFinite(xp) && xp > 0 ? xp : 0
})

const giftImage = computed(() =>
  giftPokemon.value?.animated_img ||
  giftPokemon.value?.static_img ||
  giftPokemon.value?.sprite_url ||
  ''
)

const pokemonName = computed(() =>
  giftPokemon.value?.name || giftPokemon.value?.species || 'your new Pokémon'
)

function closePrompt() {
  if (busy.value) return
  emit('close')
}

function continueFromXp() {
  if (busy.value || props.result?.error) return

  if (reachedMaxEvolution.value && props.offerGift) {
    step.value = giftPokemon.value ? 'revealed' : 'gift'
  } else {
    closePrompt()
  }
}

function requestGift() {
  if (!reachedMaxEvolution.value || giftOpening.value || giftPokemon.value) return
  // This component only presents the UI. The parent owns reward creation,
  // persistence, uniqueness checks and optional leftover-XP allocation.
  emit('open-gift')
}

// A single native dialog is used for the XP -> gift -> reveal sequence.
// Watch only presence, so parent updates to the result object don't reset the step.
watch(
  () => Boolean(props.result),
  async isOpen => {
    if (isOpen) step.value = 'xp'

    await nextTick()

    const element = dialog.value
    if (!element) return

    if (isOpen && !element.open) element.showModal()
    if (!isOpen && element.open) element.close()
  },
  { immediate: true, flush: 'post' }
)

watch(giftPokemon, pokemon => {
  if (pokemon && step.value === 'gift') step.value = 'revealed'
})

onBeforeUnmount(() => dialog.value?.close())
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="xp-prompt"
      :aria-labelledby="step === 'xp' ? 'xp-title' : 'gift-title'"
      @cancel.prevent="closePrompt"
    >
      <article
        v-if="result"
        class="xp-card"
        :class="{ 'is-loss': isLoss }"
        :aria-busy="result.saving || giftOpening"
      >
        <button
          type="button"
          class="xp-close"
          aria-label="Close experience popup"
          :disabled="busy"
          @click="closePrompt"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m7 7 10 10M17 7 7 17" />
          </svg>
        </button>

        <!-- Keep the existing XP result flow intact. -->
        <template v-if="step === 'xp'">
          <header class="xp-header">
            <div class="reward-emblem" aria-hidden="true">
              <span class="sparkle sparkle-one">✦</span>
              <span class="sparkle sparkle-two">✦</span>
              <svg class="pokeball" viewBox="0 0 80 80">
                <defs>
                  <clipPath id="xp-pokeball-clip">
                    <circle cx="40" cy="40" r="30" />
                  </clipPath>
                </defs>
                <g clip-path="url(#xp-pokeball-clip)">
                  <path fill="#ffde59" d="M8 8h64v32H8z" />
                  <path fill="#fffdf5" d="M8 40h64v32H8z" />
                  <path d="M10 40h60" stroke="#26365b" stroke-width="6" />
                </g>
                <circle cx="40" cy="40" r="30" fill="none" stroke="#26365b" stroke-width="5" />
                <circle cx="40" cy="40" r="11" fill="#fffdf5" stroke="#26365b" stroke-width="5" />
                <circle cx="40" cy="40" r="4" fill="#ffde59" />
              </svg>
            </div>

            <p class="brand">STUDYDEX · TRAINER JOURNEY</p>
            <h2 id="xp-title">{{ result.title || 'Experience update!' }}</h2>
          </header>

          <div class="xp-content" role="status" aria-live="polite">
            <div v-if="displayedPokemon" class="evolution-preview">
              <PokeSprite ref="evolutionSprite" :active-pokemon="displayedPokemon"
                :fallback-src="displayedPokemon.static_img" facing="front" embedded progress-position="hidden" />
            </div>
            <div v-if="result.saving" class="feedback-panel">
              <span class="saving-spinner" aria-hidden="true"></span>
              <h3>Updating your Pokémon…</h3>
              <p>Saving your progress.</p>
            </div>

            <div v-else-if="result.error" class="feedback-panel error-panel">
              <span class="feedback-icon" aria-hidden="true">!</span>
              <h3>We couldn’t save your XP</h3>
              <p>{{ result.error }}</p>
            </div>

            <template v-else>
              <div class="reward-panel">
                <span class="reward-label">
                  {{
                    result.duplicate
                      ? 'ALREADY RECORDED'
                      : isLoss
                        ? 'XP CHANGE'
                        : result.delta === 0
                          ? 'PROGRESS UPDATE'
                          : 'XP EARNED'
                  }}
                </span>
                <strong class="amount">
                  {{ result.delta > 0 ? '+' : '' }}{{ result.delta ?? 0 }}
                  <span>XP</span>
                </strong>
                <p class="reward-caption">
                  {{
                    result.duplicate
                      ? 'Your saved progress is safe.'
                      : isLoss
                        ? 'Keep practising. You’ve got this!'
                        : result.delta === 0
                          ? 'Every study session still counts.'
                          : 'Another step in your trainer journey!'
                  }}
                </p>
              </div>

              <div class="buddy-summary">
                <span class="buddy-icon" aria-hidden="true">✦</span>
                <div class="buddy-copy">
                  <span class="buddy-label">YOUR POKÉMON</span>
                  <strong>{{ result.pokemonName || 'Your buddy' }}</strong>
                </div>
                <div class="buddy-total">
                  <strong>{{ result.xp ?? 0 }}</strong>
                  <span>Lv. {{ result.level ?? 1 }} · XP</span>
                </div>
              </div>

              <p v-if="result.evolved || result.devolved" class="evolution-note">
                {{ animating ? (result.devolved ? 'Devolving…' : 'Evolving…')
                  : `${result.pokemonName} ${result.devolved ? 'devolved' : 'evolved'}!` }}
              </p>
              <p v-if="evolutionError || result.progressionError" class="info-note" role="status">
                {{ evolutionError || result.progressionError }}
              </p>
              <p v-if="reachedMaxEvolution" class="evolution-note">
                <span aria-hidden="true">✨</span>
                {{ result.pokemonName || 'Your Pokémon' }} reached its final evolution!
                <template v-if="offerGift">A special gift is ready.</template>
              </p>

              <p v-if="result.delta === 0" class="info-note">
                All four focus-timer rewards for today have been earned.
              </p>
              <p v-if="hasAdjustedDeduction" class="info-note">
                XP stops at the base form’s zero XP. Actual deduction:
                {{ Math.abs(result.appliedDelta) }} XP.
              </p>
              <p v-if="result.duplicate" class="info-note">
                This activity’s XP was already saved; it has not been added twice.
              </p>
            </template>
          </div>

          <footer class="xp-footer">
            <template v-if="result.error && !result.saving">
              <p class="close-note">
                XP has not been saved. Retry before closing.
                Closing dismisses this attempt without saving XP.
              </p>
              <button
                type="button"
                class="action-button"
                :disabled="typeof result.retry !== 'function'"
                @click="result.retry?.()"
              >
                Retry saving <span aria-hidden="true">↻</span>
              </button>
            </template>

            <button
              v-else
              type="button"
              class="action-button"
              :disabled="busy"
              @click="continueFromXp"
            >
              {{ result.saving ? 'Saving…' : animating ? 'Transforming…' : reachedMaxEvolution && offerGift ? 'Continue to gift' : 'Continue' }}
              <span v-if="!result.saving" aria-hidden="true">→</span>
            </button>
          </footer>
        </template>

        <!-- A gift follows the XP popup only after a confirmed final evolution. -->
        <template v-else>
          <header class="xp-header gift-header">
            <div class="gift-emblem" aria-hidden="true">{{ step === 'revealed' ? '🎉' : '🎁' }}</div>
            <p class="brand">STUDYDEX · TRAINER REWARDS</p>
            <h2 id="gift-title">
              {{ step === 'revealed' ? 'Meet your new buddy!' : 'A special gift awaits!' }}
            </h2>
            <p class="gift-subtitle">
              {{
                step === 'revealed'
                  ? 'Your new Pokémon has joined your journey.'
                  : `${result.pokemonName || 'Your Pokémon'} reached its final evolution!`
              }}
            </p>
          </header>

          <div class="xp-content" role="status" aria-live="polite">
            <div v-if="step === 'revealed' && giftPokemon" class="gift-reveal">
              <img
                v-if="giftImage"
                class="gift-sprite"
                :src="giftImage"
                :alt="pokemonName"
              />
              <div v-else class="gift-image-placeholder" aria-hidden="true">✦</div>
              <span class="reward-label">NEW POKÉMON UNLOCKED</span>
              <h3>{{ pokemonName }}</h3>
              <p v-if="Number.isFinite(giftPokemon.xp) && giftPokemon.xp > 0">
                {{ giftPokemon.xp }} XP transferred to your new buddy.
              </p>
            </div>

            <div v-else class="gift-panel">
              <span class="gift-large" aria-hidden="true">🎁</span>
              <p>Open your gift to discover a new Pokémon for your Pokédex.</p>
              <div v-if="leftoverXP > 0" class="gift-xp">
                <strong>{{ leftoverXP }} XP</strong>
                <span>remaining XP available</span>
              </div>
              <div v-if="giftOpening" class="gift-loading">
                <span class="saving-spinner" aria-hidden="true"></span>
                <span>Finding your new Pokémon…</span>
              </div>
              <p v-if="giftError" class="gift-error" role="alert">{{ giftError }}</p>
            </div>
          </div>

          <footer class="xp-footer">
            <template v-if="step === 'revealed'">
              <button type="button" class="action-button" @click="closePrompt">
                Continue <span aria-hidden="true">→</span>
              </button>
            </template>
            <template v-else>
              <button
                type="button"
                class="action-button"
                :disabled="giftOpening"
                @click="requestGift"
              >
                {{ giftOpening ? 'Opening…' : giftError ? 'Retry opening gift' : 'Open Gift 🎁' }}
              </button>
              <button
                type="button"
                class="action-button secondary-button"
                :disabled="giftOpening"
                @click="closePrompt"
              >
                Decide later
              </button>
            </template>
          </footer>
        </template>
      </article>
    </dialog>
  </Teleport>
</template>

<style scoped>
.xp-prompt,
.xp-prompt * {
  box-sizing: border-box;
}

.xp-prompt {
  width: min(460px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  margin: auto;
  padding: 0;
  overflow: auto;
  overflow-wrap: anywhere;
  border: 2px solid #e7dcc0;
  border-radius: 28px;
  background: #fffdf6;
  color: #26365b;
  font-family: 'Fredoka', sans-serif;
  font-size: 16px;
  line-height: 1.5;
  text-align: center;
  box-shadow: 0 8px 0 rgb(47 40 24 / 16%), 0 24px 80px rgb(15 28 49 / 30%);
}

.xp-prompt::backdrop {
  background: rgb(15 28 49 / 55%);
  backdrop-filter: blur(5px);
}

.xp-card {
  position: relative;
  padding: 30px 28px 26px;
}

.xp-close {
  position: absolute;
  top: 14px;
  right: 14px;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid #e6dfcc;
  border-radius: 50%;
  background: #f5f0e3;
  color: #667085;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
}

.xp-close svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
}

.xp-close:hover:not(:disabled) {
  background: #ffedaf;
  color: #26365b;
}

.reward-emblem {
  position: relative;
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  margin: 0 auto 16px;
  border: 1px solid #f2dfa0;
  border-radius: 30px;
  background: #fff2bf;
}

.pokeball {
  width: 78px;
  height: 78px;
  filter: drop-shadow(0 4px 0 rgb(121 94 24 / 12%));
}

.sparkle {
  position: absolute;
  color: #c99b28;
  line-height: 1;
}

.sparkle-one { top: 7px; right: -12px; font-size: 28px; }
.sparkle-two { bottom: 8px; left: -12px; font-size: 20px; }

.brand {
  margin: 0 0 8px;
  color: #8b7c50;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.4px;
}

.xp-header h2 {
  margin: 0;
  color: #172c50;
  font-size: clamp(24px, 6vw, 30px);
  font-weight: 650;
  line-height: 1.25;
  text-wrap: balance;
}

.xp-content { margin-top: 22px; }
.evolution-preview { height: 200px; margin-bottom: 16px; }
.evolution-preview :deep(.buddy-stage) { min-height: 0; height: 100%; flex: 1 1 0; }
.evolution-preview :deep(h3),
.evolution-preview :deep(.buddy-message),
.evolution-preview :deep(.buddy-feedback) { display: none; }

.reward-panel {
  padding: 20px 16px;
  border: 1px solid #dce9d5;
  border-radius: 20px;
  background: #f0f7e9;
}

.reward-label {
  display: block;
  color: #65815b;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.4px;
}

.amount {
  display: block;
  margin: 4px 0;
  color: #40754b;
  font-size: clamp(42px, 12vw, 60px);
  font-weight: 650;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

.amount > span { font-size: 0.45em; font-weight: 500; }
.reward-caption { margin: 8px 0 0; color: #687b60; font-size: 14px; }

.is-loss .reward-panel { border-color: #efd9d3; background: #fff1eb; }
.is-loss .amount { color: #b85b50; }
.is-loss .reward-label,
.is-loss .reward-caption { color: #986b60; }

.buddy-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  padding: 14px;
  border: 1px solid #eee7d7;
  border-radius: 16px;
  background: #fff;
  text-align: left;
}

.buddy-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #fff3c7;
  color: #b38a28;
  font-size: 25px;
}

.buddy-copy { flex: 1; min-width: 0; }
.buddy-label { display: block; margin-bottom: 2px; color: #8a91a0; font-size: 11px; font-weight: 500; letter-spacing: 0.8px; }
.buddy-copy > strong { display: block; color: #26365b; font-size: 18px; font-weight: 600; line-height: 1.3; }
.buddy-total { min-width: 0; max-width: 45%; text-align: right; }
.buddy-total strong { display: block; color: #26365b; font-size: 22px; font-weight: 600; line-height: 1.2; font-variant-numeric: tabular-nums; }
.buddy-total span { color: #87909c; font-size: 13px; }

.evolution-note {
  margin: 14px 0 0;
  padding: 12px;
  border: 1px solid #efd37f;
  border-radius: 14px;
  background: #fff7d5;
  color: #78591e;
  font-size: 14px;
  font-weight: 550;
}

.info-note { margin: 12px 4px 0; color: #7b8494; font-size: 14px; line-height: 1.5; }

.feedback-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 26px 18px;
  border: 1px solid #e4e9ee;
  border-radius: 20px;
  background: #f3f7fa;
}

.feedback-panel h3 { margin: 14px 0 6px; font-size: 20px; font-weight: 600; }
.feedback-panel p { margin: 0; color: #718096; font-size: 15px; }

.saving-spinner {
  display: inline-block;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 4px solid #e6dfc7;
  border-top-color: #c69c32;
  border-radius: 50%;
  animation: xp-spin 900ms linear infinite;
}

.error-panel { border-color: #efd9d3; background: #fff1eb; }
.feedback-icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%; background: #f8d9ce; color: #a64f43; font-size: 26px; font-weight: 600; }
.error-panel h3 { color: #a64f43; }
.error-panel p { color: #956e63; }

.xp-footer { margin-top: 22px; }
.close-note { margin: 0 0 14px; color: #986b60; font-size: 14px; line-height: 1.5; }

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  min-height: 50px;
  padding: 12px 20px;
  border: 1px solid #dfbd47;
  border-radius: 14px;
  background: #ffde59;
  color: #634f1f;
  font: inherit;
  font-size: 18px;
  font-weight: 600;
  box-shadow: 0 4px 0 #d7b44b;
  cursor: pointer;
  transition: background 150ms ease, transform 150ms ease, box-shadow 150ms ease;
}

.action-button:hover:not(:disabled) { background: #ffd542; transform: translateY(-1px); box-shadow: 0 5px 0 #d7b44b; }
.action-button:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 1px 0 #d7b44b; }
.action-button:disabled,
.xp-close:disabled { opacity: 0.6; cursor: wait; }
.action-button:focus-visible,
.xp-close:focus-visible { outline: 3px solid #416d9d; outline-offset: 4px; }

.gift-emblem {
  display: grid;
  place-items: center;
  width: 94px;
  height: 94px;
  margin: 0 auto 16px;
  border: 1px solid #f2dfa0;
  border-radius: 30px;
  background: #fff2bf;
  font-size: 50px;
}

.gift-subtitle { margin: 10px 0 0; color: #68758e; font-size: 15px; }

.gift-panel {
  padding: 20px 16px;
  border: 1px solid #eee2bd;
  border-radius: 20px;
  background: #fff9e7;
}

.gift-large { display: block; margin-bottom: 10px; font-size: 72px; line-height: 1.1; }
.gift-panel > p { margin: 0; color: #635b4c; font-size: 14px; }

.gift-xp {
  display: flex;
  flex-direction: column;
  margin-top: 14px;
  padding: 12px;
  border: 1px solid #dce9d5;
  border-radius: 14px;
  background: #f0f7e9;
  color: #40754b;
}

.gift-xp strong { font-size: 26px; }
.gift-xp span { font-size: 12px; }

.gift-loading { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 14px; color: #68758e; font-size: 13px; }
.gift-loading .saving-spinner { width: 22px; height: 22px; border-width: 3px; }
.gift-error { margin: 12px 0 0; color: #b42318; font-size: 13px; }

.gift-reveal {
  padding: 20px 16px;
  border: 1px solid #dce9d5;
  border-radius: 20px;
  background: #f0f7e9;
}

.gift-sprite { display: block; width: 112px; height: 112px; margin: 0 auto 10px; object-fit: contain; image-rendering: pixelated; }
.gift-image-placeholder { display: grid; place-items: center; width: 90px; height: 90px; margin: 0 auto 10px; color: #b38a28; font-size: 48px; }
.gift-reveal h3 { margin: 4px 0; color: #26365b; font-size: 24px; }
.gift-reveal p { margin: 8px 0 0; color: #687b60; font-size: 14px; }

.secondary-button { margin-top: 12px; border-color: #e6dfcc; background: #fff; color: #64718a; box-shadow: none; font-size: 15px; }
.secondary-button:hover:not(:disabled) { background: #f7f3e9; box-shadow: none; }

@keyframes xp-spin { to { transform: rotate(360deg); } }

@media (max-width: 480px) {
  .xp-card { padding: 26px 18px 22px; }
  .reward-emblem, .gift-emblem { width: 84px; height: 84px; border-radius: 26px; }
  .pokeball { width: 70px; height: 70px; }
  .brand { font-size: 11px; letter-spacing: 1px; }
  .buddy-summary { gap: 10px; padding: 12px; }
}

@media (prefers-reduced-motion: reduce) {
  .saving-spinner { animation: none; }
  .action-button, .xp-close { transition: none; }
}
</style>
