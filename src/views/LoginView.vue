<script setup>
  import { ref } from 'vue';

  const user_id_input = ref('');
  const password_input = ref('');

</script>
<template>
  <main>
    <div class="login-bg">
      <div class="container">
        <div class="input-container">
          <input v-model="user_id_input" type="text" name="" id="username-input" placeholder="Breeder ID"><br>
          <input v-model="password_input" type="password" name="" id="password-input" placeholder="Password">
        </div>
        <p v-if="user_id_input.trim() == ''" class="reminder">Username cannot be empty</p>
        <div class="button-container">
          <button id="loginButton">Login</button>
          <button id="registerButton">Become Breeder</button>
        </div>
        <div class="link-to-sign-up"><p>Not a breeder? <a href="/register" style="color: #ffd117;">Sign Up</a></p></div>
      </div>
    </div>
  </main>
</template>
<style scoped>
  .login-bg {
    background: url('./backgrounds/StudyDex.png'); 
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-attachment: fixed;
    min-height: 100vh;
    margin-top: 0px;
    display: flow-root;
  }

  .container {
    margin-top: 400px;
  }

  .input-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    row-gap: 0px;
  }
  .button-container {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    column-gap: 20px;
    margin-top: 26px;
  }

  #username-input, #password-input {
    border: 0;
    border-radius: 30px;
    width: 430px;
    height: 46px;

    opacity: 70%;

    text-align: center;
    font-family: "Handjet", sans-serif;
    font-size: 26px;
  }
  #username-input::placeholder, #password-input::placeholder {
    color: #4f5458;
    opacity: 100%;
  }
  #username-input, #password-input {
    border: 0;
    border-radius: 30px;
    width: 430px;
    height: 46px;

    box-shadow: 3px 3px 6px #232323;

    text-align: center;

  }

  @property --angle {
    syntax: "<angle>";
    initial-value: 0deg;
    inherits: false;
  }

  #loginButton, #registerButton {
    width: 205px;
    height: 46px;

    font-weight: 600;
    font-family: "Handjet", sans-serif;
    font-size: 24px;
    color: white;
    box-shadow: 3px 3px 6px #232323;
    border: 4px solid #ffd117;
    border-radius: 12px;
    cursor: pointer;
    background-color: #072578;
    cursor: pointer;
  }

  #loginButton:hover, #registerButton:hover {
    transform: scale(1.2);
    border-color: transparent;
    background:
      linear-gradient(#072578, #072578) padding-box,
      conic-gradient(
        from var(--angle),
        #b8860b,
        #ffd117,
        #fff2b0,
        #ffd117,
        #b8860b,
        #daa520,
        #b8860b
      ) border-box;
      animation: spin-border 3s linear infinite;
      transform: scale(1.2);
  }
  

  @keyframes spin-border {
    to { --angle: 360deg; }
  }

  #username-input:hover, #password-input:hover {
    transform: scale(1.1);
  }

  .reminder {
    text-align: center;
    color: rgb(215, 65, 65);
    font-size: 26px;
    -webkit-text-stroke: 4px black;
    paint-order: stroke fill;
    font-family: "Handjet", sans-serif;
  }

  .link-to-sign-up {
    position: absolute;

    bottom: 0.5%;
    left: 0;
    right: 0;
    text-align: center;
    color: white;
    font-size: 28px;
    -webkit-text-stroke: 4px black;
    paint-order: stroke fill;
    font-family: "Handjet", sans-serif;

  }
</style>