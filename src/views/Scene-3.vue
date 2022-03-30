<template>
  <div id="scene-3">
    <div id="buttons" class="higher">
      <button>
        <span id="hit2" class="button_top">Shoot</span>
      </button>
      <button>
        <span id="reset2" class="button_top">Reset</span>
      </button>
    </div>
  </div>
</template>

<script>
import { Options, Vue } from "vue-class-component";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CannonHelper } from "@/libs/CannonHelper.js";

@Options({
  components: {},
})
export default class Scene3 extends Vue {
  mounted() {
    const game = new Game();
  }
}

class Ball {
  static RADIUS = 0.05715 / 2;
  static MASS = 0.17;
  static MATERIAL = new CANNON.Material("ballMaterial");

  constructor(game, x, z, id = 0) {
    this.id = id;

    this.startPosition = new THREE.Vector3(x, Ball.RADIUS, z);
    this.mesh = this.createMesh(game.scene);

    this.world = game.world;
    this.game = game;

    this.rigidBody = this.createBody(x, Ball.RADIUS, z);
    this.world.addBody(this.rigidBody);
    this.reset();

    this.name = `ball${id}`;
  }

  reset() {
    this.rigidBody.velocity = new CANNON.Vec3(0);
    this.rigidBody.angularVelocity = new CANNON.Vec3(0);
    this.rigidBody.position.copy(this.startPosition);
    this.mesh.position.copy(this.startPosition);
    this.mesh.rotation.set(0, 0, 0);
    this.fallen = false;
  }

  onEnterHole() {
    this.rigidBody.velocity = new CANNON.Vec3(0);
    this.rigidBody.angularVelocity = new CANNON.Vec3(0);
    this.world.removeBody(this.rigidBody);
  }

  createBody(x, y, z) {
    const body = new CANNON.Body({
      mass: Ball.MASS, // kg
      position: new CANNON.Vec3(x, y, z), // m
      shape: new CANNON.Sphere(Ball.RADIUS),
      material: Ball.MATERIAL,
    });

    body.linearDamping = body.angularDamping = 0.5; // Hardcode
    body.allowSleep = true;

    // Sleep parameters
    body.sleepSpeedLimit = 2; // Body will feel sleepy if speed< 1 (speed == norm of velocity)
    body.sleepTimeLimit = 0.1; // Body falls asleep after 0.1s of sleepiness

    return body;
  }

  createMesh(scene) {
    const geometry = new THREE.SphereBufferGeometry(Ball.RADIUS, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      metalness: 0.0,
      roughness: 0.1,
      envMap: scene.environment,
    });

    if (this.id > 0) {
      const textureLoader = new THREE.TextureLoader()
        .setPath(
          '/pool-table/'
        )
        .load(`${this.id}ball.png`, (tex) => {
          material.map = tex;
          material.needsUpdate = true;
        });
    }

    const mesh = new THREE.Mesh(geometry, material);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add(mesh);

    return mesh;
  }

  update(dt) {
    this.mesh.position.copy(this.rigidBody.position);
    this.mesh.quaternion.copy(this.rigidBody.quaternion);

    // Has the ball fallen into a hole?
    if (this.rigidBody.position.y < -Ball.RADIUS && !this.fallen) {
      this.fallen = true;
      this.onEnterHole();
    }
  }
}

class WhiteBall extends Ball {
  constructor(game, x, z) {
    super(game, x, z);

    this.forward = new THREE.Vector3();

    this.guideLine = this.createGuideLine();
    game.scene.add(this.guideLine);

    this.dot = this.createIntersectionDot();
    game.scene.add(this.dot);

    this.raycaster = new THREE.Raycaster();

    this.game = game;
  }

  createGuideLine() {
    const points = [];
    points.push(new THREE.Vector3(0, 0, 0));
    points.push(new THREE.Vector3(0, 0, -1));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.05,
      gapSize: 0.03,
    });
    const line = new THREE.Line(geometry, material);

    line.scale.z = 3;
    line.visible = false;

    line.computeLineDistances();

    return line;
  }

  createIntersectionDot() {
    const geometry = new THREE.SphereBufferGeometry(0.01, 4, 4);
    const material = new THREE.MeshBasicMaterial({
      opacity: 0.5,
      transparent: true,
      color: 0xffff00,
    });
    return new THREE.Mesh(geometry, material);
  }

  update(dt) {
    super.update(dt);

    //update intersection dot if we're not moving
    if (this.rigidBody.sleepState == CANNON.Body.SLEEPING) {
      this.isSleeping = true;
      this.updateGuideLine();
    } else {
      this.isSleeping = false;
      this.guideLine.visible = false;
      this.dot.visible = false;
    }
  }

  updateGuideLine() {
    if (this.balls === undefined) {
      this.balls = this.game.balls.map((ball) => ball.mesh);
      this.balls.shift();
    }

    const angle = this.game.controls.getAzimuthalAngle();

    this.guideLine.position.copy(this.mesh.position);
    this.guideLine.rotation.y = angle;

    this.guideLine.visible = true;

    this.guideLine.getWorldDirection(this.forward);
    this.forward.negate();

    this.raycaster.set(this.mesh.position, this.forward);

    let intersects = this.raycaster.intersectObjects(this.balls);

    if (intersects.length > 0) {
      this.guideLine.scale.z = intersects[0].distance;
      this.dot.position.copy(intersects[0].point);
      this.dot.visible = true;
    } else {
      intersects = this.raycaster.intersectObjects(this.game.edges.children);
      if (intersects.length > 0) {
        this.guideLine.scale.z = intersects[0].distance;
      }
      this.dot.visible = false;
    }
  }

  hit(strength) {
    this.rigidBody.wakeUp();

    const position = new CANNON.Vec3();
    position.copy(this.rigidBody.position);

    const vec = new CANNON.Vec3();
    vec.copy(this.forward);

    vec.normalize();
    vec.scale(Ball.RADIUS, vec);
    position.vsub(vec, position);

    const force = new CANNON.Vec3();
    force.copy(this.forward.normalize());
    force.scale(strength, force);
    this.rigidBody.applyImpulse(force, new CANNON.Vec3());
  }

  //Resets the position to this.startPosition
  onEnterHole() {
    this.rigidBody.velocity = new CANNON.Vec3(0);
    this.rigidBody.angularVelocity = new CANNON.Vec3(0);
    this.rigidBody.position.copy(this.startPosition);
  }
}

function addCannonVisual(body, color = 0xaaaaaa) {
  if (!helper) return;
  helper.addVisual(body, color);
}

function createQuaternionFromAxisAngle(axis, angle) {
  const q = new CANNON.Quaternion();
  q.setFromAxisAngle(axis, angle);
  return q;
}

let scene, world, debug, helper;

class StrengthBar {
  constructor(options) {
    this.domElement = document.createElement("div");
    this.domElement.style.position = "fixed";
    this.domElement.style.bottom = "40px";
    this.domElement.style.width = "50%";
    this.domElement.style.left = "50%";
    this.domElement.style.transform = "translateX(-50%)";
    this.domElement.style.height = "15px";
    this.domElement.style.display = "none";
    this.domElement.style.alignItems = "center";
    this.domElement.style.justifyContent = "center";
    this.domElement.style.zIndex = "1111";
    const barBase = document.createElement("div");
    barBase.style.background = "#aaa";
    barBase.style.width = "100%";
    barBase.style.minWidth = "100px";
    barBase.style.borderRadius = "10px";
    barBase.style.height = "15px";
    this.domElement.appendChild(barBase);
    const bar = document.createElement("div");
    bar.style.background = "#22a";
    bar.style.width = "0%";
    bar.style.borderRadius = "10px";
    bar.style.height = "100%";
    bar.style.width = "0";
    barBase.appendChild(bar);
    this.strengthBar = bar;

    this._strength = 0;

    document.body.appendChild(this.domElement);
  }

  update() {
    if (this.visible) {
      this._strength += 0.01;
      this.strength = this._strength;
    }
  }

  get strength() {
    return this._strength;
  }

  set strength(strength) {
    if (strength < 0) strength = 0;
    if (strength > 1) strength = 1;
    this._strength = strength;
    const percent = strength * 100;
    this.strengthBar.style.width = `${percent}%`;
  }

  set visible(value) {
    if (value) {
      if (!this.visible) this._strength = 0;
      this.domElement.style.display = "flex";
    } else {
      this.domElement.style.display = "none";
    }
  }

  get visible() {
    return this.domElement.style.display == "flex";
  }
}

class Arch {
  constructor(params) {
    this.body = new CANNON.Body({
      mass: 0, // mass == 0 makes the body static
      material: Table.floorMaterial,
    });

    params = params || {};
    //default values
    this.position = params.position || { x: 0, y: 0, z: 0 };

    //relative arch radius, (actual radius is of the arch is slightly larger..)
    this.radius = params.radius || Ball.RADIUS + 0.02;

    this.box_autowidth = params.box_autowidth || false;
    this.box_width = params.box_width || 2;
    this.box_height = params.box_height || 5;
    this.box_thickness = params.box_thickness || 2;
    this.no_of_boxes = params.no_of_boxes || 5;

    this.body.position.set(this.position.x, this.position.y, this.position.z);

    const y_axis = new CANNON.Vec3(0, 1, 0);

    this.body.quaternion.setFromAxisAngle(y_axis, Math.PI);

    const box_increment_angle = Math.PI / (2 * this.no_of_boxes); //base value for the angle of a boxes center to the center of the circle
    // Get box x-len according to radius so that there is no overlap
    let x_len = this.radius * Math.tan(box_increment_angle);

    if (!this.box_autowidth) x_len = this.box_width;

    // Use a box shape as child shape
    const shape = new CANNON.Box(
      new CANNON.Vec3(x_len, this.box_height, this.box_thickness)
    );

    for (let i = 0; i < this.no_of_boxes; i++) {
      const angle = box_increment_angle + (i * Math.PI) / this.no_of_boxes;
      let b_x = Math.cos(angle);
      let b_z = Math.sin(angle);

      b_x *= this.radius + this.box_thickness;
      b_z *= this.radius + this.box_thickness;

      this.body.addShape(
        shape,
        new CANNON.Vec3(b_x, 0, b_z),
        createQuaternionFromAxisAngle(y_axis, Math.PI / 2 - angle)
      );
    }
  }
}

/** This is the wall segment  that is parallel to the x-axis */
class LongWall {
  constructor(x, y, z, width) {
    const height = 0.02;
    const thickness = 0.025;

    this.body = new CANNON.Body({
      mass: 0, // mass == 0 makes the body static
      material: Table.wallMaterial,
    });

    //adjust the x-coordinates to change the angle of the triangle shape
    const vertices1 = [
      0,
      height,
      -2 * thickness, // vertex 0
      0,
      height,
      0, // vertex 1
      -0.028,
      height,
      -2 * thickness, // vertex 2
      0,
      -height,
      -2 * thickness, // vertex 3
      0,
      -height,
      0, // vertex 4
      -0.028,
      -height,
      -2 * thickness, // vertex 5
    ];

    //corner of table
    const vertices2 = [
      0,
      height,
      -2 * thickness, // vertex 0
      0,
      height,
      0, // vertex 1
      0.08,
      height,
      -2 * thickness, // vertex 2
      0,
      -height,
      -2 * thickness, // vertex 3
      0,
      -height,
      0, // vertex 4
      0.08,
      -height,
      -2 * thickness, // vertex 5
    ];

    const indices = [
      0, 1, 2, 3, 4, 5, 5, 0, 2, 5, 3, 0, 3, 4, 1, 3, 1, 0, 4, 5, 1, 5, 2, 1,
    ];

    const trimeshShape1 = new CANNON.Trimesh(vertices1, indices);
    const trimeshShape2 = new CANNON.Trimesh(vertices2, indices);

    this.body.position.set(x, y, z);
    this.body.addShape(trimeshShape1, new CANNON.Vec3(-width, 0, 0));
    this.body.addShape(trimeshShape2, new CANNON.Vec3(width, 0, 0));

    const boxshape = new CANNON.Box(new CANNON.Vec3(width, height, thickness));

    this.body.addShape(boxshape, new CANNON.Vec3(0, 0, -thickness));
  }
}

/** This is the wall segment  that is parallel to the z-axis */
class ShortWall {
  constructor(x, y, z, width) {
    const height = 0.02;
    const thickness = 0.04;

    this.body = new CANNON.Body({
      mass: 0, // mass == 0 makes the body static
      material: Table.wallMaterial,
    });

    // How to make a mesh with a single triangle
    const vertices1 = [
      0,
      height,
      -2 * thickness, // vertex 0
      0,
      height,
      0, // vertex 1
      -0.125,
      height,
      -2 * thickness, // vertex 2
      0,
      -height,
      -2 * thickness, // vertex 3
      0,
      -height,
      0, // vertex 4
      -0.125,
      -height,
      -2 * thickness, // vertex 5
    ];

    // Corner of table
    const vertices2 = [
      0,
      height,
      -2 * thickness, // vertex 0
      0,
      height,
      0, // vertex 1
      0.125,
      height,
      -2 * thickness, // vertex 2
      0,
      -height,
      -2 * thickness, // vertex 3
      0,
      -height,
      0, // vertex 4
      0.125,
      -height,
      -2 * thickness, // vertex 5
    ];

    const indices = [
      0, 1, 2, 3, 4, 5, 5, 0, 2, 5, 3, 0, 3, 4, 1, 3, 1, 0, 4, 5, 1, 5, 2, 1,
    ];

    const trimeshShape1 = new CANNON.Trimesh(vertices1, indices);
    const trimeshShape2 = new CANNON.Trimesh(vertices2, indices);

    this.body.position.set(x, y, z);
    this.body.addShape(trimeshShape1, new CANNON.Vec3(-width, 0, 0));
    this.body.addShape(trimeshShape2, new CANNON.Vec3(width, 0, 0));

    const boxshape = new CANNON.Box(new CANNON.Vec3(width, height, thickness));

    this.body.addShape(boxshape, new CANNON.Vec3(0, 0, -thickness));

    this.body.quaternion.setFromAxisAngle(
      new CANNON.Vec3(0, 1, 0),
      -Math.PI / 2
    );
  }
}

class Hole {
  constructor(x, y, z, rotation) {
    // The "wall" arch
    this.arch1 = new Arch({
      position: { x, y, z },
      no_of_boxes: 6,
      box_height: 0.06,
      box_autowidth: true,
      box_thickness: 0.01,
    });
    // the "floor" arch
    this.arch2 = new Arch({
      position: { x, y: y - 0.01, z },
      no_of_boxes: 6,
      box_height: 0.01,
      box_width: 0.025,
      box_thickness: 0.03,
    });

    this.arch1.body.quaternion.setFromAxisAngle(
      new CANNON.Vec3(0, 1, 0),
      Math.PI - rotation
    );
    this.arch2.body.quaternion.setFromAxisAngle(
      new CANNON.Vec3(0, 1, 0),
      -rotation
    );

    world.addBody(this.arch1.body);
    world.addBody(this.arch2.body);

    if (debug) {
      addCannonVisual(this.arch1.body, scene);
      addCannonVisual(this.arch2.body, scene);
    }
  }
}

class Table {
  static LENGTH = 2.7432;
  static WIDTH = 1.3716;
  static HEIGHT = 0.06;
  static FLOOR_MATERIAL = new CANNON.Material("floorMaterial");
  static WALL_MATERIAL = new CANNON.Material("wallMaterial");

  constructor(game) {
    world = game.world;
    scene = game.scene;
    debug = game.debug;
    helper = game.helper;

    this.createRigidBodies();
  }

  createRigidBodies() {
    this.felt = this.createFelt();
    this.holes = this.createHoles();
    this.walls = this.createWalls();
  }

  createFelt() {
    const narrowStripWidth = 0.02;
    const narrowStripLength = Table.WIDTH / 2 - 0.05;
    const floorThickness = 0.01;
    const mainAreaX = Table.LENGTH / 2 - 2 * narrowStripWidth;

    const floorBox = new CANNON.Box(
      new CANNON.Vec3(mainAreaX, floorThickness, Table.WIDTH / 2)
    );
    const floorBoxSmall = new CANNON.Box(
      new CANNON.Vec3(narrowStripWidth, floorThickness, narrowStripLength)
    );

    const body = new CANNON.Body({
      mass: 0, // mass == 0 makes the body static
      material: Table.floorContactMaterial,
    });

    body.addShape(floorBox, new CANNON.Vec3(0, -floorThickness, 0));
    body.addShape(
      floorBoxSmall,
      new CANNON.Vec3(-mainAreaX - narrowStripWidth, -floorThickness, 0)
    );
    body.addShape(
      floorBoxSmall,
      new CANNON.Vec3(mainAreaX + narrowStripWidth, -floorThickness, 0)
    );

    if (debug) {
      addCannonVisual(body, scene);
    }

    world.addBody(body);

    return body;
  }

  createHoles() {
    const corner = {
      x: Table.LENGTH / 2 + 0.015,
      z: Table.WIDTH / 2 + 0.015,
      PIby4: Math.PI / 4,
    };
    const middleZ = Table.WIDTH / 2 + 0.048;

    const holes = [
      //corners of -z table side
      new Hole(corner.x, 0, -corner.z, corner.PIby4),
      new Hole(-corner.x, 0, -corner.z, -corner.PIby4),
      //middle holes
      new Hole(0, 0, -middleZ, 0),
      new Hole(0, 0, middleZ, Math.PI),
      //corners of +z table side
      new Hole(corner.x, 0, corner.z, 3 * corner.PIby4),
      new Hole(-corner.x, 0, corner.z, -3 * corner.PIby4),
    ];

    return holes;
  }

  createWalls() {
    const pos = { x: Table.LENGTH / 4 - 0.008, y: 0.02, z: Table.WIDTH / 2 };
    //walls of -z
    const wall1 = new LongWall(pos.x, pos.y, -pos.z, 0.61);
    const wall2 = new LongWall(-pos.x, pos.y, -pos.z, 0.61);
    wall2.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI);

    //walls of +z
    const wall3 = new LongWall(pos.x, pos.y, pos.z, 0.61);
    const wall4 = new LongWall(-pos.x, pos.y, pos.z, 0.61);
    wall3.body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI);
    wall4.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI);

    //wall of +x
    pos.x = Table.LENGTH / 2;
    const wall5 = new ShortWall(pos.x, pos.y, 0, 0.605);

    //wall of -x
    const wall6 = new ShortWall(-pos.x, pos.y, 0, 0.605);
    wall6.body.quaternion.setFromAxisAngle(
      new CANNON.Vec3(0, 1, 0),
      -1.5 * Math.PI
    );

    const walls = [wall1, wall2, wall3, wall4, wall5, wall6];
    walls.forEach((wall) => {
      world.addBody(wall.body);
      if (debug) {
        addCannonVisual(wall.body, scene);
      }
    });

    return walls;
  }
}

class Game {
  constructor() {
    this.initThree();
    this.initWorld();
    this.initScene();

    this.strengthBar = new StrengthBar();

    const strengthControl = document.getElementById("hit2");

    if ("ontouchstart" in document.documentElement) {
      strengthControl.addEventListener("touchstart", this.mousedown.bind(this));
      strengthControl.addEventListener("touchend", this.mouseup.bind(this));
    } else {
      strengthControl.addEventListener("mousedown", this.mousedown.bind(this));
      strengthControl.addEventListener("mouseup", this.mouseup.bind(this));
      document.addEventListener("keydown", this.keydown.bind(this));
      document.addEventListener("keyup", this.keyup.bind(this));
    }

    document.getElementById('reset2').addEventListener('click', () => {
      console.log('reset')
      for (let i = 0; i < this.balls.length; i++) {
        this.balls[i].reset()
      }
    });

    if (this.helper) this.helper.wireframe = true;
  }

  initThree() {
    const container = document.getElementById( 'scene-3' );

    this.debug = false;

    this.clock = new THREE.Clock();

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      20
    );
    this.camera.position.set(-3, 1.5, 0);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);
    this.scene.fog = new THREE.Fog( 0xffffff, 10, 50 );

    const ambient = new THREE.HemisphereLight(0x0d0d0d, 0x020202, 0.01);
    this.scene.add(ambient);

    this.createLight(Table.LENGTH / 4);
    this.createLight(-Table.LENGTH / 4);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.physicallyCorrectLights = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    window.addEventListener("resize", this.resize.bind(this));
  }

  keydown(evt) {
    if (evt.keyCode == 32) {
      this.strengthBar.visible = true;
    }
  }

  keyup(evt) {
    if (evt.keyCode == 32) {
      this.strengthBar.visible = false;
      this.strikeCueball();
    }
  }

  mousedown(evt) {
    this.strengthBar.visible = true;
  }

  mouseup(evt) {
    this.strengthBar.visible = false;
    this.strikeCueball();
  }

  strikeCueball() {
    if (this.cueball.isSleeping) this.cueball.hit(this.strengthBar.strength);
  }

  initWorld() {
    const w = new CANNON.World();
    w.gravity.set(0, -9.82, 0); // m/s²

    w.solver.iterations = 10;
    w.solver.tolerance = 0; // Force solver to use all iterations

    // Allow sleeping
    w.allowSleep = true;

    w.fixedTimeStep = 1.0 / 60.0; // seconds

    this.setCollisionBehaviour(w);

    if (this.debug) this.helper = new CannonHelper(this.scene, w);

    this.world = w;
  }

  setCollisionBehaviour(world) {
    world.defaultContactMaterial.friction = 0.2;
    world.defaultContactMaterial.restitution = 0.8;

    const ball_floor = new CANNON.ContactMaterial(
      Ball.MATERIAL,
      Table.FLOOR_MATERIAL,
      { friction: 0.7, restitution: 0.1 }
    );

    const ball_wall = new CANNON.ContactMaterial(
      Ball.MATERIAL,
      Table.WALL_MATERIAL,
      { friction: 0.5, restitution: 0.6 }
    );

    world.addContactMaterial(ball_floor);
    world.addContactMaterial(ball_wall);
  }

  createLight(x, debug = false) {
    //SpotLight( color : Integer, intensity : Float, distance : Float, angle : Radians, penumbra : Float, decay : Float )
    const spotlight = new THREE.SpotLight(0xffffe5, 2.5, 10, 0.8, 0.5, 2);

    spotlight.position.set(x, 1.5, 0);
    spotlight.target.position.set(x, 0, 0); //the light points directly towards the xz plane
    spotlight.target.updateMatrixWorld();

    spotlight.castShadow = true;
    spotlight.shadow.camera.fov = 70;
    spotlight.shadow.camera.near = 1;
    spotlight.shadow.camera.far = 2.5;
    spotlight.shadow.mapSize.width = 2048;
    spotlight.shadow.mapSize.height = 2048;

    this.scene.add(spotlight);

    if (debug) {
      const spotLightHelper = new THREE.SpotLightHelper(spotlight);
      this.scene.add(spotLightHelper);
    }
  }

  setEnvironment() {
    const loader = new RGBELoader();
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    loader.load(
      "/pool-table/living_room.hdr",
      (texture) => {
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        pmremGenerator.dispose();
        this.scene.environment = envMap;
      },
      undefined,
      (err) => console.error(err)
    );
  }

  loadGLTF() {
    const loader = new GLTFLoader().setPath(
      "/pool-table/"
    );

    // Load a glTF resource
    loader.load(
      // resource URL
      "pool-table.glb",
      // called when the resource is loaded
      (gltf) => {
        console.log(gltf)
        this.table = gltf.scene;
        this.table.position.set(-Table.LENGTH / 2, 0, Table.WIDTH / 2);
        this.table.traverse((child) => {
          if (child.name == "Cue") {
            this.cue = child;
            child.visible = false;
          }
          if (child.name == "Felt") {
            this.edges = child;
          }
          if (child.isMesh) {
            child.material.metalness = 0.0;
            child.material.roughness = 0.3;
          }
          if (
            child.parent !== null &&
            child.parent.name !== null &&
            child.parent.name == "Felt"
          ) {
            child.material.roughness = 0.8;
            child.receiveShadow = true;
          }
        });
        this.scene.add(gltf.scene);

        this.renderer.setAnimationLoop(this.render.bind(this));
      }
    );
  }

  initScene() {
    this.setEnvironment();

    this.table = new Table(this);

    this.loadGLTF();

    this.createBalls();
  }

  createBalls() {
    this.balls = [new WhiteBall(this, -Table.LENGTH / 4, 0)];

    const rowInc = 1.74 * Ball.RADIUS;
    let row = { x: Table.LENGTH / 4 + rowInc, count: 6, total: 6 };
    const ids = [4, 3, 14, 2, 15, 13, 7, 12, 5, 6, 8, 9, 10, 11, 1];

    for (let i = 0; i < 15; i++) {
      if (row.total == row.count) {
        //Initialize a new row
        row.total = 0;
        row.count--;
        row.x -= rowInc;
        row.z = (row.count - 1) * (Ball.RADIUS + 0.002);
      }
      this.balls.push(new Ball(this, row.x, row.z, ids[i]));
      row.z -= 2 * (Ball.RADIUS + 0.002);
      row.total++;
    }

    this.cueball = this.balls[0];
  }

  updateUI(evt) {
    switch (evt.event) {
      case "balldrop":
        break;
      case "whitedrop":
        break;
    }
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.controls.target.copy(this.cueball.mesh.position);
    this.controls.update();
    if (this.helper) this.helper.update();
    if (this.strengthBar.visible) this.strengthBar.update();
    const dt = this.clock.getDelta();
    this.world.step(this.world.fixedTimeStep);
    this.balls.forEach((ball) => ball.update(dt));
    this.renderer.render(this.scene, this.camera);
  }
}
</script>