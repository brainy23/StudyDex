<template>
  <main>
    <div class="container">
      <div class="input-container">
        <input type="text" name="" id="username-input" placeholder="Breeder ID"><br>
        <input type="password" name="" id="password-input" placeholder="Password">
      </div>
      <div class="button-container">
        <button id="loginButton">Login</button>
        <button id="registerButton">Become Breeder</button>
      </div>
    </div>
  </main>
</template>
<style>
  body {
    background-image: url('./backgrounds/StudyDex.png'); 
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-attachment: fixed;
    min-height: 100vh;
    margin: 0;
    
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


</style>