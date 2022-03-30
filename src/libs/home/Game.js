/* eslint-disable */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CannonHelper } from '@/libs/CannonHelper.js';

export default class Game {
  constructor() {
    this.initThree();
    this.initWorld();
    this.initScene();
  }

  initThree() {
    const container = document.getElementById('home');

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10);
    this.camera.position.set(0, 0, 5);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.3);
    this.scene.add(ambient);

    const light = new THREE.DirectionalLight();
    light.position.set(0.2, 1, 0);
    this.scene.add(light);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    this.renderer.setAnimationLoop(this.render.bind(this));

    window.addEventListener('resize', this.resize.bind(this));
  }

  initWorld() {
    const world = new CANNON.World();
    world.gravity.set(0, -1, 0);

    this.helper = new CannonHelper(this.scene, world);

    this.world = world;
  }

  initScene() {
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
        position: new CANNON.Vec3(this.random(-5, 5), 5, this.random(-2, 2)),
        shape,
      })
      // body.force(Cannon.Vec3(0, 0, 0)) 
      body.quaternion = new CANNON.Quaternion(this.random(10, -10), this.random(70, 100), this.random(10, -10), this.random(10, -10))
      this.world.addBody(body)

      const geometry = new THREE.SphereBufferGeometry( 0.5, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        metalness: 0.0,
        roughness: 0.1,
        envMap: this.helper.scene.environment,
      });
  
      const textureLoader = new THREE.TextureLoader()
      .setPath(
        '/pool-table/'
      )
      .load(`${Math.floor(Math.random() * (15 - 1) + 1)}ball.png`, (tex) => {
        material.map = tex;
        material.needsUpdate = true;
      });
  
      const mesh = new THREE.Mesh(geometry, material);
  
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);

      body.threemesh = mesh;
  
      this.helper.scene.add(mesh);
      bodies.push(body)

      if (bodies.length > 30) {
        const bodyToKill = bodies.shift()
        this.helper.removeVisual(bodyToKill)
        this.world.removeBody(bodyToKill)
      }
    }, 300);
  }

  random(min, max){
    const range = max - min;
    return Math.random() * range + min; 
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.world.step(0.0167);
    this.helper.update();
    this.renderer.render(this.scene, this.camera);
  }
}