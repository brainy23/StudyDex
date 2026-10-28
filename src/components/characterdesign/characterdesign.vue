<script setup>

import { ref } from 'vue'

// avatars need to be redesigned because i dont have chatgpt premium to generate clean designs :(
// idle avatar
const avatars = ref([
  '/avatars/boy_0.png',
  '/avatars/boy_1.png',
  '/avatars/boy_2.png',
  '/avatars/boy_3.png',
  '/avatars/boy_4.png',
  '/avatars/girl_0.png',
  '/avatars/girl_1.png',
  '/avatars/girl_2.png',
  '/avatars/girl_3.png',
  '/avatars/girl_4.png',
])

const selected = ref(avatars.value[0])
const playerName = ref('')

// player name
function start() {
  if (!playerName.value.trim()) return
  console.log('Player:', playerName.value.trim(), selected.value)
}

 


</script>

<template>
  <div class="room">
    
    <img :src="selected" class="big" alt="Your avatar" />
 
    <div class="panel">
      <h1>Choose your avatar</h1>
 
      <div class="list">
        <button
          v-for="src in avatars"
          :key="src"
          :class="['pick', { active: src === selected }]"
          @click="selected = src"
        >
          <img :src="src" alt="" />
        </button>
      </div>
 
      <label for="name">Your name</label>
      <input id="name" v-model="playerName" maxlength="12" placeholder="Type your name" />
 
      <button class="start-btn" :disabled="!playerName.trim()" @click="start">
        Let's go!
      </button>
    </div>
  </div>
</template>
 
<style scoped>
.room {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    url('/backgrounds/trainer-home-v3.png') center bottom / cover,
    linear-gradient(#7cc8f2, #c9ecfb);
}
 
.big {
  position: absolute;
  left: 50%;
  bottom: 9vh;
  height: 62vh;
  transform: translateX(-50%);
}
 
.panel {
  position: absolute;
  top: 50%;
  right: 4vw;
  transform: translateY(-50%);
  width: 340px;
  padding: 20px;
  border-radius: 12px;
  background: #fffaf0;
  border: 3px solid #1f3a93;
  box-shadow: 0 5px 0 #1f3a93;
  font-family: 'Nunito', sans-serif;
  color: #17324d;
}
 
h1 {
  margin: 0 0 14px;
  font: 700 22px 'Fredoka', sans-serif;
  color: #1f3a93;
}
 
.list {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}
 
.pick {
  padding: 4px;
  border: 3px solid #d6cdb8;
  border-radius: 8px;
  background: #a9dff7;
  cursor: pointer;
}
 
.pick img {
  display: block;
  width: 100%;
}
 
.pick.active {
  border-color: #1f3a93;
  background: #ffd000;
}
 
label {
  display: block;
  margin-bottom: 6px;
  font-weight: 800;
}
 
input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  margin-bottom: 16px;
  border: 3px solid #1f3a93;
  border-radius: 8px;
  font: 700 16px 'Nunito', sans-serif;
}
 
.start-btn {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: #ffd000;
  color: #2b2100;
  border: 3px solid #1f3a93;
  box-shadow: 0 5px 0 #1f3a93;
  font: 700 18px 'Nunito', sans-serif;
  cursor: pointer;
}
 
.start-btn:active {
  transform: translateY(4px);
  box-shadow: 0 1px 0 #1f3a93;
}
 
.start-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
 