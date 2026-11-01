<script setup>
import { useTimer } from '../timer/useTimer'

defineProps({
  topicId: { type: String, default: null },
  compact: { type: Boolean, default: false },
})
const {
  state,
  display,
  dailyCompleted,
  recoveryAvailable,
  DAILY_LIMIT,
  startSession,
  startBreak,
  pause,
  resume,
  endSession,
} = useTimer()
</script>

<template>
  <section class="study-panel study-timer" aria-labelledby="focus-timer-heading">
    <h2 id="focus-timer-heading" :class="{ 'visually-hidden': compact }">Study Block Timer</h2>
    <p class="study-eyebrow">
      {{ state.phase === 'focus' ? '25-minute focus' : '5-minute break' }}
    </p>
    <p class="study-timer-display" role="timer" aria-live="off">{{ display }}</p>
    <div class="study-button-row">
      <button
        v-if="state.status === 'idle' || (state.status === 'complete' && state.phase === 'break')"
        class="study-button"
        @click="startSession(topicId)"
      >
        Start Study Session
      </button>
      <button v-else-if="state.status === 'running'" class="study-button" @click="pause()">
        Pause
      </button>
      <button v-else-if="state.status === 'paused'" class="study-button" @click="resume">
        Resume
      </button>
      <button v-else class="study-button" @click="startBreak">Start 5-minute Break</button>
      <button
        v-if="state.status !== 'idle'"
        class="study-button study-button-secondary"
        @click="endSession"
      >
        End Session
      </button>
    </div>
    <p v-if="state.notice && !compact" class="study-note" role="status">{{ state.notice }}</p>
    <p v-if="!compact" class="study-focus-count">
      {{ dailyCompleted }} focus {{ dailyCompleted === 1 ? 'block' : 'blocks' }} completed today
    </p>
    <progress v-if="!compact"
      :value="Math.min(dailyCompleted, DAILY_LIMIT)"
      :max="DAILY_LIMIT"
      aria-label="Daily focus goal"
    />
    <p v-if="!compact" class="study-note">Daily goal: {{ DAILY_LIMIT }} blocks · Singapore time</p>
    <p v-if="!compact" class="study-note">
      {{
        recoveryAvailable
          ? 'Saved on this browser.'
          : 'Timer recovery is unavailable in this browser.'
      }}
      XP rewards are not connected yet.
    </p>
  </section>
</template>
