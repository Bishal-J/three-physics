// main.ts

import "./style.css";

import * as THREE from "three";
import GUI from "lil-gui";
import { PointerLockControls } from "three/examples/jsm/Addons.js";
import * as CANNON from "cannon-es";

// Movement state
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

// Vectors
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const sphereToUpdate: { mesh: THREE.Mesh; body: CANNON.Body }[] = [];

// GUI
const gui = new GUI();

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Canvas
const canvas = document.querySelector("canvas.webgl") as HTMLCanvasElement;

// Scene
const scene = new THREE.Scene();
scene.fog = new THREE.Fog("#F2EFE7", 0, 200);

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(0, 10, 0);
scene.add(camera);

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setClearColor(scene.fog.color);
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.camera.left = -7;
directionalLight.shadow.camera.top = 7;
directionalLight.shadow.camera.right = 7;
directionalLight.shadow.camera.bottom = -7;
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// World
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0),
  allowSleep: true,
});
world.broadphase = new CANNON.SAPBroadphase(world);

// Plane
const planeShape = new CANNON.Plane();
const planeBody = new CANNON.Body({
  type: CANNON.Body.STATIC,
  shape: planeShape,
});
planeBody.quaternion.setFromEuler(-Math.PI * 0.5, 0, 0);
world.addBody(planeBody);

const planeGeometry = new THREE.PlaneGeometry(2000, 2000);
const planeMaterial = new THREE.MeshStandardMaterial({
  color: "#81E7AF",
  metalness: 0.3,
  roughness: 0.4,
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI * 0.5;
plane.receiveShadow = true;
scene.add(plane);

// Controls
const controls = new PointerLockControls(camera, canvas);
scene.add(camera);

const blocker = document.getElementById("blocker") as HTMLElement;
const instructions = document.getElementById("instructions") as HTMLElement;

instructions.addEventListener("click", () => controls.lock());

controls.addEventListener("lock", () => {
  blocker.style.display = "none";
  instructions.style.display = "none";
});

controls.addEventListener("unlock", () => {
  blocker.style.display = "flex";
  instructions.style.display = "";
});

// Shoot sphere
const shootSphere = () => {
  const radius = 0.5;
  const shape = new CANNON.Sphere(radius);
  const body = new CANNON.Body({ mass: 2, shape });
  body.linearDamping = 0.1;

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  const startPosition = camera.position
    .clone()
    .add(direction.clone().multiplyScalar(1));
  body.position.set(startPosition.x, startPosition.y, startPosition.z);

  const shootVelocity = 20;
  body.velocity.set(
    direction.x * shootVelocity,
    direction.y * shootVelocity,
    direction.z * shootVelocity
  );

  world.addBody(body);

  const geometry = new THREE.SphereGeometry(radius, 16, 32);
  const material = new THREE.MeshStandardMaterial({
    color: "#FFA55D",
    metalness: 0.3,
    roughness: 0.4,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  scene.add(mesh);

  sphereToUpdate.push({ mesh, body });
};

// --- ✅ Optimized update function ---
const updateSpheres = () => {
  for (let i = sphereToUpdate.length - 1; i >= 0; i--) {
    const { mesh, body } = sphereToUpdate[i];

    // Optional cleanup if out of bounds
    if (body.position.y < -50) {
      scene.remove(mesh);
      world.removeBody(body);
      sphereToUpdate.splice(i, 1);
    } else {
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);
    }
  }
};

// Input
const handleKeyDown = (event: KeyboardEvent) => {
  switch (event.code) {
    case "KeyW":
    case "ArrowUp":
      moveForward = true;
      break;
    case "KeyA":
    case "ArrowLeft":
      moveLeft = true;
      break;
    case "KeyS":
    case "ArrowDown":
      moveBackward = true;
      break;
    case "KeyD":
    case "ArrowRight":
      moveRight = true;
      break;
    case "Space":
      if (canJump) {
        velocity.y += 350;
        canJump = false;
      }
      break;
  }
};

const handleKeyUp = (event: KeyboardEvent) => {
  switch (event.code) {
    case "KeyW":
    case "ArrowUp":
      moveForward = false;
      break;
    case "KeyA":
    case "ArrowLeft":
      moveLeft = false;
      break;
    case "KeyS":
    case "ArrowDown":
      moveBackward = false;
      break;
    case "KeyD":
    case "ArrowRight":
      moveRight = false;
      break;
  }
};

// Events
document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);

window.addEventListener("click", () => {
  if (controls.isLocked) shootSphere();
});

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Animation
const clock = new THREE.Clock();
let previousTime = 0;

const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - previousTime;
  previousTime = elapsedTime;

  world.step(1 / 60, deltaTime, 3);

  if (controls.isLocked) {
    // Dampening
    velocity.x -= velocity.x * 10.0 * deltaTime;
    velocity.z -= velocity.z * 10.0 * deltaTime;
    velocity.y -= 9.8 * 100.0 * deltaTime;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward)
      velocity.z -= direction.z * 400.0 * deltaTime;
    if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * deltaTime;

    controls.moveRight(-velocity.x * deltaTime);
    controls.moveForward(-velocity.z * deltaTime);

    camera.position.y += velocity.y * deltaTime;

    if (camera.position.y < 10) {
      velocity.y = 0;
      camera.position.y = 10;
      canJump = true;
    }
  }

  // ✅ Use optimized updater
  updateSpheres();

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
};

tick();
