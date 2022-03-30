<template>
  <div id="home">
    <div id="hero">
      <h1>Let's Pool</h1>
      <p id="subtitle">We gonna play billard, we gonna learn physics and threejs here, and the goal is just to have fun</p>
    </div>
    <div id="footer">
      © Following <a href="https://niklever.com/courses/" target="_blank" rel="noopener noreferrer" class="link">Nicholas Lever tutorial</a>
    </div>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import Game from '@/libs/home/Game';

@Options({
  components: {},
})
export default class Home extends Vue {
  mounted() {
    const game: Game = new Game();
  }
}
</script>

<style lang="scss">
#home {
  width: 100%;
  height: 100%;
  z-index: 1;
}

#hero {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: transparent;

  h1 {
    max-width: 400px;
    font-size: 50px;
    margin-bottom: 20px;
    font-weight: 800;
    color: #000;
    line-height: 1.1em;
    letter-spacing: -.035em;
    animation: bounceIn .75s linear forwards;
  }

  p {
    margin: 0;
    text-align: center;
    color: #757575;
    line-height: 1.4em;
    font-size: 18px;
    max-width: 400px;
    opacity: 0;
    animation: bounceIn .75s linear forwards 1s;
  }
}

#footer {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  color: rgba(black, .75);

  a {
    color: rgba(black, .6);
    text-decoration: none;
    transition: all .3s;
    &:hover {
      color: black !important;
    }
  }
}

@keyframes bounceIn {
  0% {
      opacity: 0;
      transform: scale(.3);
  }
  50% {
      opacity: 0.9; 
      transform: scale(1.1);
  }
  70% {
      opacity: 1; 
      transform: scale(.9);
  }
  100% {
      opacity: 1; 
      transform: scale(1);
  }
}
</style>

