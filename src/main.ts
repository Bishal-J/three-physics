import "./style.css";

import * as THREE from "three";
import GUI from "lil-gui";
import { PointerLockControls } from "three/examples/jsm/Addons.js";
import * as CANNON from "cannon-es";

// Debug
const gui = new GUI();

// Creating World
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0),
  allowSleep: true,
});
world.broadphase = new CANNON.SAPBroadphase(world);

// Canvas
const canvas = document.querySelector("canvas.webgl") as HTMLCanvasElement;

// Scene
const scene = new THREE.Scene();

const sphereToUpdate: { mesh: THREE.Mesh; body: CANNON.Body }[] = [];

// Sphere
const shootSphere = () => {
  const sphereShape = new CANNON.Sphere(0.5);
  const body = new CANNON.Body({
    mass: 2,
    shape: sphereShape,
  });

  // Position sphere at camera position
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);

  const startPosition = new THREE.Vector3();
  startPosition
    .copy(camera.position)
    .add(cameraDirection.clone().multiplyScalar(1)); // place slightly in front of camera

  body.position.set(startPosition.x, startPosition.y, startPosition.z);
  body.linearDamping = 0.1; // Less damping for more realistic projectile motion

  // Apply velocity in the direction camera is facing
  const shootVelocity = 20;
  const velocity = new CANNON.Vec3(
    cameraDirection.x * shootVelocity,
    cameraDirection.y * shootVelocity,
    cameraDirection.z * shootVelocity
  );
  body.velocity.set(velocity.x, velocity.y, velocity.z);

  world.addBody(body);

  // THREE.js Mesh
  const sphereGeometry = new THREE.SphereGeometry(0.5, 16, 32);
  const sphereMaterial = new THREE.MeshStandardMaterial({
    color: "#FFA55D",
    metalness: 0.3,
    roughness: 0.4,
  });
  const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  mesh.castShadow = true;
  scene.add(mesh);

  sphereToUpdate.push({
    mesh,
    body,
  });
};

// Plane Body
const planeShape = new CANNON.Plane();
const planeBody = new CANNON.Body({
  type: CANNON.Body.STATIC,
  shape: planeShape,
});
planeBody.quaternion.setFromEuler(-Math.PI * 0.5, 0, 0);
world.addBody(planeBody);

// Plane
const planeGeometry = new THREE.PlaneGeometry(2000, 2000);
const planeMaterial = new THREE.MeshStandardMaterial({
  color: "#81E7AF",
  metalness: 0.3,
  roughness: 0.4,
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI * 0.5;
plane.castShadow = true;
plane.receiveShadow = true;
scene.add(plane);

// Lights
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

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(0, 10, 0);
scene.add(camera);

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Controls
const blocker = document.getElementById("blocker") as HTMLElement;
const instructions = document.getElementById("instructions") as HTMLElement;
const controls = new PointerLockControls(camera, canvas);

instructions.addEventListener("click", () => {
  controls.lock();
});

controls.addEventListener("lock", () => {
  blocker.style.display = "none";
  instructions.style.display = "none;";
});

controls.addEventListener("unlock", () => {
  blocker.style.display = "block";
  instructions.style.display = "";
});

// Shoot Sphere

window.addEventListener("click", () => {
  console.log("Entered", controls.isLocked);
  if (controls.isLocked) {
    shootSphere();
  }
});

// Fog
const fog = new THREE.Fog("#F2EFE7", 0, 200);
scene.fog = fog;

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setClearColor(scene.fog.color);
renderer.setSize(sizes.width, sizes.height);
renderer.render(scene, camera);

const clock = new THREE.Clock();
let oldElapsedTime = 0;

const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;

  // Update Physics
  world.step(1 / 60, deltaTime, 3);

  for (const sphere of sphereToUpdate) {
    sphere.mesh.position.copy(sphere.body.position);
    sphere.mesh.quaternion.copy(sphere.body.quaternion);
  }

  // Renderer
  renderer.render(scene, camera);

  window.requestAnimationFrame(tick);
};

tick();
