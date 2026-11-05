<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { deleteOwnAccount } from '../../services/accountDeletionService'

const props = defineProps({
  userId: { type: String, required: true },
  email: { type: String, required: true },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['deleted', 'busy'])
const dialog = ref(null)
const passwordInput = ref(null)
const password = ref('')
const confirmation = ref('')
const deleting = ref(false)
const error = ref('')
let active = true
const ready = computed(
  () => !props.disabled && !deleting.value && password.value && confirmation.value === 'DELETE',
)

function clear() {
  password.value = ''
  confirmation.value = ''
  error.value = ''
}
async function open() {
  if (props.disabled || deleting.value) return
  clear()
  dialog.value.showModal()
  await nextTick()
  passwordInput.value?.focus()
}
function cancel(event) {
  if (deleting.value) {
    event?.preventDefault()
    return
  }
  dialog.value.close()
  clear()
}
async function confirm() {
  if (!ready.value) return
  const owner = props.userId
  const currentPassword = password.value
  password.value = ''
  error.value = ''
  deleting.value = true
  emit('busy', true)
  try {
    const result = await deleteOwnAccount({
      password: currentPassword,
      confirmation: confirmation.value,
      expectedUserId: owner,
    })
    if (!active || props.userId !== owner) return
    dialog.value?.close()
    clear()
    emit('deleted', result)
  } catch (cause) {
    if (active && props.userId === owner)
      error.value = cause.message || 'We couldn’t delete your account. Please try again.'
  } finally {
    if (active) {
      deleting.value = false
      emit('busy', false)
    }
  }
}
watch(
  () => props.userId,
  () => {
    dialog.value?.close()
    clear()
  },
)
onUnmounted(() => {
  active = false
  clear()
})
</script>

<template>
  <section class="account-card delete-account-card" aria-labelledby="delete-account-heading">
    <h2 id="delete-account-heading">Delete account</h2>
    <p>This permanently removes your account, saved Pokémon, packs and study history.</p>
    <button type="button" class="delete-button" :disabled="disabled || deleting" @click="open">
      Delete my account
    </button>
    <dialog
      ref="dialog"
      aria-labelledby="delete-confirm-heading"
      aria-describedby="delete-confirm-help"
      @cancel="cancel"
      @close="clear"
    >
      <form @submit.prevent="confirm">
        <h2 id="delete-confirm-heading">Permanently delete your account?</h2>
        <p>
          Account: <strong>{{ email }}</strong>
        </p>
        <p id="delete-confirm-help">
          Your Pokémon, packs and saved study history will be removed. You cannot undo this. Shared
          lessons stay available to other students.
        </p>
        <fieldset :disabled="deleting || disabled">
          <label for="delete-password">Confirm your current password</label>
          <input
            id="delete-password"
            ref="passwordInput"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
          />
          <label for="delete-confirmation">Type DELETE to confirm</label>
          <input
            id="delete-confirmation"
            v-model="confirmation"
            autocomplete="off"
            spellcheck="false"
            required
          />
        </fieldset>
        <p v-if="error" class="delete-error" role="alert">{{ error }}</p>
        <p v-if="deleting" role="status">Deleting your account… Please keep this page open.</p>
        <div class="delete-actions">
          <button type="button" :disabled="deleting" @click="cancel">Keep my account</button>
          <button type="submit" class="delete-button" :disabled="!ready">
            {{ deleting ? 'Deleting…' : 'Permanently delete my account' }}
          </button>
        </div>
      </form>
    </dialog>
  </section>
</template>

<style scoped>
.delete-account-card {
  border: 1px solid #e798a5;
}
button {
  cursor: pointer;
  border: 1px solid #8d9bb0;
  border-radius: 8px;
  padding: 10px 14px;
  font: inherit;
  font-weight: 650;
  background: #f4f7fb;
  color: #152c48;
}
.delete-button {
  background: #a81e38;
  color: white;
  border-color: #a81e38;
}
button:disabled {
  opacity: 0.55;
  cursor: default;
}
dialog {
  max-width: min(560px, calc(100vw - 32px));
  max-height: 85dvh;
  overflow: auto;
  border: 2px solid #a81e38;
  border-radius: 14px;
  padding: 24px;
  background: #fff;
  color: #182d46;
}
dialog::backdrop {
  background: #071426bd;
}
fieldset {
  display: grid;
  gap: 10px;
  border: 0;
  padding: 0;
}
input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 10px;
  border: 1px solid #66738a;
  border-radius: 7px;
  font: inherit;
}
.delete-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}
.delete-error {
  color: #a01530;
}
:focus-visible {
  outline: 3px solid #225db0;
  outline-offset: 3px;
}
</style>
