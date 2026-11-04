<script setup>
import { ref, watch, nextTick } from 'vue'
const props=defineProps({ result:{type:Object,default:null} })
const emit=defineEmits(['close'])
const dialog=ref(null)
watch(()=>props.result,async result=>{
  await nextTick()
  if(result && dialog.value && !dialog.value.open) dialog.value.showModal()
  if(!result && dialog.value?.open) dialog.value.close()
},{immediate:true})
</script>
<template>
  <Teleport to="body">
    <dialog ref="dialog" class="xp-prompt" aria-labelledby="xp-title" @cancel.prevent="!result?.saving && !result?.error && emit('close')">
      <article v-if="result" :aria-busy="result.saving">
        <div class="pokeball" aria-hidden="true">●</div>
        <p class="brand">STUDYDEX · POKÉMON EXPERIENCE</p>
        <h2 id="xp-title">{{ result.title }}</h2>
        <div role="status" aria-live="polite">
          <template v-if="!result.saving && !result.error">
            <strong class="amount" :class="{ loss:result.delta<0 }">{{ result.delta>0 ? '+' : '' }}{{ result.delta }} XP</strong>
            <p>{{ result.pokemonName }} now has <b>{{ result.xp }} XP</b>.</p>
            <p v-if="result.delta===0">All four focus-timer rewards have been earned.</p>
            <p v-if="result.appliedDelta!==result.delta">XP stops at zero. Actual deduction: {{ Math.abs(result.appliedDelta) }} XP.</p>
            <p v-if="result.duplicate">This activity’s XP was already saved; it has not been added twice.</p>
          </template>
          <p v-else>{{ result.error || 'Updating your Pokémon…' }}</p>
        </div>
        <button v-if="result.error" @click="result.retry">Retry saving</button>
        <button v-else :disabled="result.saving" @click="emit('close')">{{ result.saving ? 'Saving…' : 'Continue' }}</button>
      </article>
    </dialog>
  </Teleport>
</template>
<style scoped>
.xp-prompt{width:min(440px,calc(100vw - 32px));padding:30px;border:3px solid #c4a0e1;border-radius:28px;background:#fffdf8;color:#303557;text-align:center;font-family:system-ui,sans-serif;box-shadow:0 20px 80px #190c4344}.xp-prompt::backdrop{background:#18132b99;backdrop-filter:blur(5px)}.brand{font-size:11px;letter-spacing:.13em;color:#87652f;font-weight:800}.amount{display:block;font-size:54px;color:#7744b1}.loss{color:#b74053}.pokeball{margin:auto;border:4px solid #4c3b69;border-radius:50%;width:62px;height:62px;display:grid;place-items:center;background:linear-gradient(#b080d5 46%,#4c3b69 46% 54%,white 54%);color:white;font-size:34px;text-shadow:0 0 3px #4c3b69}button{border:0;border-radius:14px;background:#7550ad;color:#fff;padding:12px 28px;font:inherit;font-weight:800;cursor:pointer}button:disabled{opacity:.6;cursor:wait}button:focus-visible{outline:3px solid #e9b93d;outline-offset:3px}
</style>
