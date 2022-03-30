<template>
  <div id="scene-0">
  </div>
</template>

<script>
import { Options, Vue } from 'vue-class-component';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { CannonHelper } from '@/libs/CannonHelper.js';

@Options({
  components: {},
})
export default class Scene0 extends Vue {
  mounted() {
    const game = new Game();
  }
}

class Game{
  constructor(){
    this.initThree();
    this.initWorld();
    this.initScene();
  }

  initThree(){
    const container = document.getElementById( 'scene-0' );
    
    this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 100 );
    this.camera.position.set( 0, 8, 10 );
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color( 0xffffff );
    this.scene.fog = new THREE.Fog( 0xffffff, 10, 50 );

    const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.3);
    this.scene.add(ambient);
    
    const light = new THREE.DirectionalLight();
    light.position.set( 0.2, 1, 0);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    const size = 30;
    light.shadow.camera.top = size;
    light.shadow.camera.right = size;
    light.shadow.camera.bottom = -size;
    light.shadow.camera.left = -size;
    light.shadow.camera.near = 0.2;
    light.shadow.camera.far = 10;
    this.scene.add(light);
  
    this.renderer = new THREE.WebGLRenderer({ antialias: true } );
    this.renderer.shadowMap.enabled = true;
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( this.renderer.domElement );
    
    const controls = new OrbitControls( this.camera, this.renderer.domElement );
    
    this.renderer.setAnimationLoop(this.render.bind(this));

    window.addEventListener('resize', this.resize.bind(this) );
  }

  initWorld() {
    const world = new CANNON.World();
    world.gravity.set(0, -10, 0);

    this.helper = new CannonHelper( this.scene, world);

    this.world = world;
  }

  random(min, max){
    const range = max - min;
    return Math.random() * range + min; 
  }
      
  initScene(){
    // Static ground plane
    const shape = new CANNON.Box(new CANNON.Vec3(2.5, 2.5, 0.1))
    const groundBody = new CANNON.Body({ mass: 0 })
    groundBody.addShape(shape)
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    this.world.addBody(groundBody)
    this.helper.addVisual(groundBody, 0x66FF66);

    const size = 0.3;
    const bodies = [];
    let i = 0
    setInterval(() => {
      // Sphere
      i++;
      let shape;
      
      shape = new CANNON.Sphere(size);

      const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(this.random(-2, 2), 4, this.random(-2, 2)),
        shape
      })
      
      this.world.addBody(body)
      this.helper.addVisual(body, 0xFF4444);
      bodies.push(body)

      if (bodies.length > 30) {
        const bodyToKill = bodies.shift()
        this.helper.removeVisual(bodyToKill)
        this.world.removeBody(bodyToKill)
      }
    }, 300);
  }

  resize(){
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( window.innerWidth, window.innerHeight );  
  }

  render( ) {   
    this.world.step(0.0167);
    this.helper.update();
    this.renderer.render( this.scene, this.camera );
  }
}
</script>
