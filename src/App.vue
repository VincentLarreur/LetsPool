<template>
  <div id="nav">
    <button v-bind:class="{ active: isOnRoute('/') }">
      <router-link class="button_top nav_button" to="/"><img src="/home.png" alt="home"/></router-link>
    </button>
    <button v-bind:class="{ active: isOnRoute('/scene-0') }">
      <router-link class="button_top nav_button" to="/scene-0"><span>0</span></router-link>
    </button>
    <button v-bind:class="{ active: isOnRoute('/scene-1') }">
      <router-link class="button_top nav_button" to="/scene-1"><span>1</span></router-link>
    </button>
    <button v-bind:class="{ active: isOnRoute('/scene-2') }">
      <router-link class="button_top nav_button" to="/scene-2"><span>2</span></router-link>
    </button>
    <button v-bind:class="{ active: isOnRoute('/scene-3') }">
      <router-link class="button_top nav_button" to="/scene-3"><img src="/favicon.png" alt="play"/></router-link>
    </button>
  </div>
  
  <router-view v-slot="{ Component }">
    <transition name="fade">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';

@Options({
  components: {},
})
export default class App extends Vue {
  isOnRoute(route: string) {
    return this.$router.currentRoute.value.path === route;
  }
}
</script>

<style lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
html, body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  position: relative;
  font-family: 'Poppins', sans-serif;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

#app {
  width: 100%;
  height: 100%;
}

#nav {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
}

#buttons {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 0;
}

.higher {
  margin-bottom: 60px;
}

button {
  margin: 10px;
  padding: 0;
  /* Variables */
 --button_radius: 0.75em;
 --button_color: #e8e8e8;
 --button_outline_color: #000000;
 font-size: 17px;
 font-weight: bold;
 border: none;
 border-radius: var(--button_radius);
 background: var(--button_outline_color);
}

.button_top {
 display: block;
 box-sizing: border-box;
 border: 2px solid var(--button_outline_color);
 border-radius: var(--button_radius);
 padding: 0.75em 1.5em;
 background: var(--button_color);
 color: var(--button_outline_color);
 transform: translateY(-0.2em);
 transition: transform 0.1s ease;
 text-decoration: none;
 img, span {
   width: 15px;
 }
}

button:hover .button_top {
  /* Pull the button upwards when hovered */
 transform: translateY(-0.33em);
}

button.active .button_top {
  /* Push the button downwards when pressed */
 transform: translateY(-0.05em);
}

button:active .button_top {
  /* Push the button downwards when pressed */
 transform: translateY(0);
}
</style>
