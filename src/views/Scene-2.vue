<template>
  <div id="scene-2">
    <div id="buttons">
      <button>
        <span id="hit1" class="button_top">Shoot</span>
      </button>
      <button>
        <span id="reset1" class="button_top">Reset</span>
      </button>
    </div>
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
export default class Scene2 extends Vue {
  mounted() {
    const game = new Game();
  }
}

class Ball{
    static RADIUS = 0.05715 / 2;
    static MASS = 0.17;
    static CONTACT_MATERIAL = new CANNON.Material("ballMaterial");
    
    constructor(game, x, z, id=0) {
        this.id = id;
    
        this.startPosition = new THREE.Vector3(x, Ball.RADIUS, z);
        
        this.world = game.world;
        this.game = game;

        this.rigidBody = this.createBody(x, Ball.RADIUS, z);
        this.world.addBody(this.rigidBody);
 
        const color = (id==0) ? 0xFFFFFF : 0xFF4444;
        this.mesh = game.helper.addVisual(this.rigidBody, color);

        this.name = `ball${id}`;

        this.forward = new THREE.Vector3(0,0,-1);
        this.up = new THREE.Vector3(0,1,0);
        this.tmpVec = new THREE.Vector3();
        this.tmpQuat = new THREE.Quaternion();
    }

    hit(strength=1) {
      this.rigidBody.wakeUp();
      
      const theta = this.game.controls.getAzimuthalAngle();
      this.tmpQuat.setFromAxisAngle(this.up, theta);

      const forward = this.forward.clone().applyQuaternion(this.tmpQuat);
    
      const force = new CANNON.Vec3();
      force.copy(forward);
      force.scale(strength, force);
      
      this.rigidBody.applyImpulse(force, new CANNON.Vec3());
    }

    reset() {
        this.rigidBody.velocity = new CANNON.Vec3(0);
        this.rigidBody.angularVelocity = new CANNON.Vec3(0);
        this.rigidBody.position.copy(this.startPosition);
    }
    
  createBody(x,y,z) {
      const body = new CANNON.Body({
        mass: Ball.MASS, // kg
        position: new CANNON.Vec3(x,y,z), // m
        shape: new CANNON.Sphere(Ball.RADIUS),
        material: Ball.CONTACT_MATERIAL
      });
    
      body.linearDamping = body.angularDamping = 0.5; // Hardcode
      body.allowSleep = true;
    
      // Sleep parameters
      body.sleepSpeedLimit = 2; // Body will feel sleepy if speed< 1 (speed == norm of velocity)
      body.sleepTimeLimit = 0.1; // Body falls asleep after 0.1s of sleepiness
    
      return body;
    }
}

let scene, world, debug, helper;

function addCannonVisual(body, color=0xAAAAAA){
    if (!helper) return;
    helper.addVisual(body, color);
}

class Arch{
    constructor(params) {
        this.body = new CANNON.Body({
            mass: 0, // mass == 0 makes the body static
            material: Table.floorContactMaterial
        });
  
        params = params || {};
        //default values
        this.position = params.position || { x: 0, y: 0, z: 0};
  
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
        const shape = new CANNON.Box(new CANNON.Vec3(x_len, this.box_height, this.box_thickness));
  
        for (let i = 0; i < this.no_of_boxes; i++) {
            const angle = box_increment_angle + (i * Math.PI / this.no_of_boxes);
            let b_x = Math.cos(angle);
            let b_z = Math.sin(angle);
  
            b_x *= this.radius + this.box_thickness;
            b_z *= this.radius + this.box_thickness;
  
            this.body.addShape(shape,
                new CANNON.Vec3(b_x, 0, b_z),
                helper.createQuaternionFromAxisAngle(y_axis, Math.PI / 2 - angle)
            );
        }
    }
}

/** This is the wall segment  that is parallel to the x-axis */
class LongWall{
    constructor(x, y, z, width) {
        const height = 0.02;
        const thickness = 0.025;
  
        this.body = new CANNON.Body({
            mass: 0, // mass == 0 makes the body static
            material: Table.wallContactMaterial
        });
  
        //adjust the x-coordinates to change the angle of the triangle shape
        const vertices1 = [
            -0.028,     height, -2 * thickness, // vertex 0
            0,     height,  0,             // vertex 1
            0,  height, -2 * thickness, // vertex 2
            -0.028,    -height, -2 * thickness, // vertex 3
            0,    -height,  0,             // vertex 4
            0, -height, -2 * thickness  // vertex 5
        ];
  
        //corner of table
        const vertices2 = [
            0,  height, -2 * thickness, // vertex 0
            0,  height,  0,             // vertex 1
            0.08,  height, -2 * thickness, // vertex 2
            0, -height, -2 * thickness, // vertex 3
            0, -height,  0,             // vertex 4
            0.08, -height, -2 * thickness  // vertex 5
        ];
  
        const indices = [
            0, 1, 2,
            5, 4, 3,
            5, 0, 2,
            5, 3, 0,
            3, 4, 1,
            3, 1, 0,
            4, 5, 1,
            5, 2, 1
        ];

        const trimeshShape1 = new CANNON.Trimesh(vertices1, indices);
        const trimeshShape2 = new CANNON.Trimesh(vertices2, indices);
  
        this.body.position.set(x,y,z);
        this.body.addShape(trimeshShape1, new CANNON.Vec3(-width, 0, 0));
        this.body.addShape(trimeshShape2, new CANNON.Vec3( width, 0, 0));
  
        const boxshape = new CANNON.Box(new CANNON.Vec3(width, height, thickness));
  
        this.body.addShape(boxshape, new CANNON.Vec3(0 ,0, -thickness));
    }
}

/** This is the wall segment  that is parallel to the z-axis */
class ShortWall{
    constructor(x, y, z, width) {
        const height = 0.02;
        const thickness = 0.04;

        this.body = new CANNON.Body({
            mass: 0, // mass == 0 makes the body static
            material: Table.wallContactMaterial
        });
  
        // How to make a mesh with a single triangle
        const vertices1 = [
            -0.125,  height, -2 * thickness, // vertex 0
            0,  height,  0,             // vertex 1
            0,  height, -2*thickness,   // vertex 2
            -0.125, -height, -2*thickness,   // vertex 3
            0, -height,  0,             // vertex 4
            0, -height, -2*thickness    // vertex 5
        ];
  
        // Corner of table
        const vertices2 = [
            0,  height, -2 * thickness,  // vertex 0
            0,  height,  0,              // vertex 1
            0.125,  height, -2 * thickness,  // vertex 2
            0, -height, -2 * thickness,  // vertex 3
            0, -height,  0,              // vertex 4
            0.125, -height, -2 * thickness   // vertex 5
        ];
  
        const indices = [
            0, 1, 2,
            3, 4, 5,
            5, 0, 2,
            5, 3, 0,
            3, 4, 1,
            3, 1, 0,
            4, 5, 1,
            5, 2, 1
        ];

        const trimeshShape1 = new CANNON.Trimesh(vertices1, indices);
        const trimeshShape2 = new CANNON.Trimesh(vertices2, indices);
  
        this.body.position.set(x,y,z);
        this.body.addShape(trimeshShape1, new CANNON.Vec3(-width, 0, 0));
        this.body.addShape(trimeshShape2, new CANNON.Vec3( width, 0, 0));
  
        const boxshape = new CANNON.Box(new CANNON.Vec3(width, height, thickness));
  
        this.body.addShape(boxshape, new CANNON.Vec3(0 ,0, -thickness));
  
        this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);
    }
}

class Hole{
    constructor(x, y, z, rotation) {
       // The "wall" arch
        this.arch1 = new Arch({
            position: {x, y, z},
            no_of_boxes: 6,
            box_height: 0.06,
            box_autowidth: true,
            box_thickness: 0.01
        });
        // the "floor" arch
        this.arch2 = new Arch({
            position: {x, y: y - 0.01, z},
            no_of_boxes: 6,
            box_height: 0.01,
            box_width: 0.025,
            box_thickness: 0.03
        });
  
        this.arch1.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI - rotation);
        this.arch2.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -rotation);
  
        world.addBody(this.arch1.body);
        world.addBody(this.arch2.body);

        if (debug) {
            addCannonVisual(this.arch1.body, 0x3333FF, false, false);
            addCannonVisual(this.arch2.body, 0x33FFFF, false, false);
        }
    }
}

class Table{

    static LENGTH = 2.7432;
    static WIDTH = 1.3716;
    static HEIGHT = 0.06;
    static FLOOR_CONTACT_MATERIAL = new CANNON.Material('floorMaterial');
    static WALL_CONTACT_MATERIAL = new CANNON.Material('wallMaterial');

    constructor(game){
        world = game.world;
        scene = game.scene;
        debug = game.debug;
        helper = game.helper;

        this.createRigidBodies();
    }

    createRigidBodies(){
        this.felt = this.createFelt(); 
        this.holes = this.createHoles();
        this.walls = this.createWalls();
    }

    createFelt(){
        const narrowStripWidth = 0.02;
        const narrowStripLength = Table.WIDTH / 2 - 0.05;
        const floorThickness = 0.01;
        const mainAreaX = Table.LENGTH / 2 - 2 * narrowStripWidth;
      
        const floorBox = new CANNON.Box(new CANNON.Vec3(mainAreaX, floorThickness, Table.WIDTH / 2));
        const floorBoxSmall = new CANNON.Box(new CANNON.Vec3(narrowStripWidth, floorThickness, narrowStripLength));
      
        const body = new CANNON.Body({
          mass: 0, // mass == 0 makes the body static
          material: Table.floorContactMaterial
        });

        body.addShape(floorBox,      new CANNON.Vec3(0, -floorThickness, 0));
        body.addShape(floorBoxSmall, new CANNON.Vec3(-mainAreaX - narrowStripWidth, -floorThickness, 0));
        body.addShape(floorBoxSmall, new CANNON.Vec3( mainAreaX + narrowStripWidth, -floorThickness, 0));
      
        if (debug) {
          addCannonVisual(body, 0x66FF66, false, true);
        }

        world.addBody(body);

        return body;
    }

    createHoles(){
        const corner = { x: Table.LENGTH/2 + 0.015, z: Table.WIDTH/2 + 0.015, PIby4: Math.PI/4  }
        const middleZ = Table.WIDTH/2 + 0.048;

        const holes = [
            //corners of -z table side
            new Hole(corner.x, 0, -corner.z,  corner.PIby4),
            new Hole(-corner.x, 0, -corner.z, -corner.PIby4),
            //middle holes
            new Hole(0, 0, -middleZ, 0),
            new Hole(0, 0,  middleZ, Math.PI),
            //corners of +z table side
            new Hole( corner.x, 0, corner.z,  3 * corner.PIby4 ),
            new Hole(-corner.x, 0, corner.z, -3 * corner.PIby4 )
        ];

        return holes;
    }

    createWalls(){
        const pos = { x:Table.LENGTH/4 - 0.008, y:0.02, z:Table.WIDTH/2}
        //walls of -z
        const wall1 = new LongWall( pos.x, pos.y, -pos.z, 0.61);
        const wall2 = new LongWall(-pos.x, pos.y, -pos.z, 0.61);
        wall2.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI);

        //walls of +z
        const wall3 = new LongWall( pos.x, pos.y, pos.z, 0.61);
        const wall4 = new LongWall(-pos.x, pos.y, pos.z, 0.61);
        wall3.body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0),  Math.PI);
        wall4.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI);

        //wall of +x
        pos.x = Table.LENGTH/2;
        const wall5 = new ShortWall(pos.x, pos.y, 0, 0.605);

        //wall of -x
        const wall6 = new ShortWall(-pos.x, pos.y, 0, 0.605);
        wall6.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -1.5 * Math.PI);

        const walls = [wall1, wall2, wall3, wall4, wall5, wall6];
       
        walls.forEach( wall => {
            world.addBody(wall.body);
            if (debug) {
                addCannonVisual(wall.body, 0x00DD00, false, false);
            }
        });

        return walls;
    }
}

class Game{
   constructor(){
     this.debug = true;
     
     this.initThree();
     this.initWorld();
     this.initScene();
     
     const elm = document.getElementById('hit1');
     elm.addEventListener('click', () => {
       this.cueball.hit();
     })
     document.getElementById('reset1').addEventListener('click', () => {
      for (let i = 0; i < this.balls.length; i++) {
        this.balls[i].reset()
      }
    })
   }

   initThree(){
    const container = document.getElementById( 'scene-2' );
    
    this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 20 );
		this.camera.position.set( -3, 1.5, 0 );
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color( 0xffffff );
    this.scene.fog = new THREE.Fog( 0xffffff, 10, 50 );

    const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.3);
    this.scene.add(ambient);
    
    const light = new THREE.DirectionalLight();
    light.position.set( 0.2, 1, 1);
    light.castShadow = true;
    this.scene.add(light);
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 512;
    light.shadow.camera.top = 1;
    light.shadow.camera.right = 2;
    light.shadow.camera.bottom = -1;
    light.shadow.camera.left = -2;
    light.shadow.camera.near = 0.2;
    light.shadow.camera.far = 4;
  
    this.renderer = new THREE.WebGLRenderer({ antialias: true } );
    this.renderer.shadowMap.enabled = true;
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( this.renderer.domElement );
    
    this.controls = new OrbitControls( this.camera, this.renderer.domElement );
    
    this.renderer.setAnimationLoop(this.render.bind(this));

    window.addEventListener('resize', this.resize.bind(this) );
  }

   initWorld() {
    const w = new CANNON.World();
    w.gravity.set(0, -9.82, 0); // m/s²
  
    // Allow sleeping
    w.allowSleep = true;
  
    w.fixedTimeStep = 1.0 / 60.0; // seconds
  
    this.setCollisionBehaviour(w);

    this.helper = new CannonHelper( this.scene, w);
    
    this.world = w;
  }

  setCollisionBehaviour(world) {
    world.defaultContactMaterial.friction = 0.2;
    world.defaultContactMaterial.restitution = 0.8;
  
    const ball_floor = new CANNON.ContactMaterial(
      Ball.CONTACT_MATERIAL,
      Table.FLOOR_CONTACT_MATERIAL,
      {friction: 0.7, restitution: 0.1}
    );

    world.addContactMaterial(ball_floor);
  }
      // Spheres
  initScene(){
    //Create a simple table
    this.table = new Table(this);
    this.createBalls();
  }

  createBalls(){
    this.balls = [ new Ball(this, -Table.LENGTH/4, 0) ];

    const rowInc = 1.74 * Ball.RADIUS;
    let row = { x:Table.LENGTH/4+rowInc, count:6, total:6 };
    const ids = [4,3,14,2,15,13,7,12,5,6,8,9,10,11,1];

    for(let i=0; i<15; i++){
        if (row.total==row.count){
            //Initialize a new row
            row.total = 0;
            row.count--;
            row.x -= rowInc;
            row.z = (row.count-1) * (Ball.RADIUS + 0.002);
        }
        this.balls.push( new Ball(this, row.x, row.z, ids[i]));
        row.z -= 2 * (Ball.RADIUS + 0.002);
        row.total++;
    }

    this.cueball = this.balls[0];
  }

  resize(){
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( window.innerWidth, window.innerHeight );  
  }

  render( ) { 
    this.controls.target.copy(this.balls[0].mesh.position);
    this.controls.update();  
    this.world.step(this.world.fixedTimeStep);
    this.helper.update();
    this.renderer.render( this.scene, this.camera );
  }
}
</script>