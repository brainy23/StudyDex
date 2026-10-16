<script setup>
  import { ref, computed } from 'vue';
  const question_no = ref(1);

</script>
<template>
  <main>
    <div class="register-bg">
      <div class="container">
        <!-- Username, email, and password fields -->
        <p class="question-prompt" v-if="question_no == 1">What's your email?</p>
        <p class="question-prompt" v-if="question_no == 2">What's your name?</p>
        <p class="question-prompt" v-if="question_no == 4">Enter a Password</p>

        <div class="input-container" v-if="question_no == 1">
          <input type="text" name="" id="email-input" placeholder="Enter Email"><br>
          <!-- <input v-model="password_input" type="password" name="" id="password-input" placeholder="Enter Password">
          <input  type="password" name="" id="confirm-password-input" placeholder="Confirm Password"> -->
        </div>

        <div class="input-container" v-if="question_no == 2">
          <input v-model="user_id_input" @input="console.log(user_id_input)" type="text" name="" id="username-input" placeholder="Enter Username"><br>
          <!-- <input v-model="password_input" type="password" name="" id="password-input" placeholder="Enter Password">
          <input  type="password" name="" id="confirm-password-input" placeholder="Confirm Password"> -->
        </div>
        <div class="select-container" v-if="question_no == 3">
          <select name="" id="level-selector">
            <option value="">Select Level</option>
            <option value="">Primary 1</option>
            <option value="">Primary 2</option>
            <option value="">Primary 3</option>
            <option value="">Primary 4</option>
            <option value="">Primary 5</option>
            <option value="">Primary 6</option>
          </select>
        </div>


        <div class="input-container" v-if="question_no == 4">
          <input type="password" name="" id="username-input" placeholder="Password"><br>
          <!-- <input v-model="password_input" type="password" name="" id="password-input" placeholder="Enter Password">
          <input  type="password" name="" id="confirm-password-input" placeholder="Confirm Password"> -->
        </div>

        <div class="input-container" style="margin-top: -30px;" v-if="question_no == 4">
          <p class="question-prompt">Confirm Password</p>
          <input type="password" name="" id="username-input" placeholder="Password" style="margin-top: -20px;"><br>
          <!-- <input v-model="password_input" type="password" name="" id="password-input" placeholder="Enter Password">
          <input  type="password" name="" id="confirm-password-input" placeholder="Confirm Password"> -->
        </div>


        <div class="button-container">
          <button id="prevButton" @click="(question_no == 1?question_no = 1:question_no -= 1)">< Prev Question</button>
          <button id="nextButton" @click="(question_no == 4?question_no = 4:question_no += 1)">Next Question ></button>
        </div>   
      </div>
      <p class="link-to-sign-in">Already a breeder? <a href="/login" class="link-to-sign-in" style="color: #ffd117;">Sign In</a></p>
    </div>
  </main>
</template>
<style scoped>
  .register-bg {
    background: url('./backgrounds/StudyDex.png'); 
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-attachment: fixed;
    min-height: 100vh;
    margin-top: 0px;
    display: flow-root;

    font-family: "Handjet", sans-serif;
    color: white;
  }

  .container {
    margin-top: 360px;
  }

  .input-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;


    row-gap: 20px;
  }

  .question-prompt {
    color: white;
    font-size: 28px;
    -webkit-text-stroke: 4px black;
    paint-order: stroke fill;

    text-align: center;
  }

  .button-container {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    column-gap: 20px;
    margin-top: 26px;
  }

  .select-container {
    display: flex;
    justify-content: center;

    padding: 43px;
  }

  #username-input, #password-input, #confirm-password-input, #email-input {
    border: 0;
    border-radius: 30px;
    width: 430px;
    height: 36px;

    opacity: 70%;

    box-shadow: 3px 3px 6px #232323;
    text-align: center;
    font-family: "Handjet", sans-serif;
    font-size: 26px;
  }
  #username-input::placeholder, #password-input::placeholder, #confirm-password-input::placeholder, #email-input::placeholder{
    color: #4f5458;
    opacity: 100%;
  }


  @property --angle {
    syntax: "<angle>";
    initial-value: 0deg;
    inherits: false;
  }

  #prevButton, #nextButton {
    width: 205px;
    height: 46px;
    margin-top: -24px;

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

  #username-input:hover, #prevButton:hover, #nextButton:hover {
    transform: scale(1.1);
  }

  #level-selector {
    appearance: none;

    width: 205px;
    height: 46px;
    padding: 0 44px 0 16px;

    font-family: "Handjet", sans-serif;
    font-size: 24px;
    font-weight: 600;
    color: white;

    background-color: #072578;
    border: 4px solid #ffd117;
    border-radius: 12px;
    cursor: pointer;
    box-shadow: 3px 3px 6px rgba(0, 0, 0, 0.3);

    /* custom gold arrow */
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23ffd117' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
    background-repeat: no-repeat;
    background-position: right 12px center;

    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  #level-selector:hover {
    transform: scale(1.05);
    box-shadow: 0 0 14px rgba(255, 209, 23, 0.6);
  }

  #level-selector:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 209, 23, 0.4);
  }

  /* the opened list */
  #level-selector option {
    background-color: #072578;
    color: white;
    font-family: "Handjet", sans-serif;
    font-size: 20px;
  }

  .link-to-sign-in {
    margin-top: 180px;
    color: white;
    font-size: 28px;
    -webkit-text-stroke: 4px black;
    paint-order: stroke fill;
    text-align: center;
  }

</style>