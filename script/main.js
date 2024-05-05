import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { World } from "./world";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { createUI } from "./ui";
import { Player } from "./player";
import { Physics } from "./physics";
import { blocks } from "./blocks";
import { ModelLoader } from "./modelLoader";

const stats = new Stats();
document.body.append(stats.dom);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x80a0e0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Camera setup
const orbitCamera = new THREE.PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);
orbitCamera.position.set(-32, 32, -32);
orbitCamera.layers.enable(1);
const controls = new OrbitControls(orbitCamera, renderer.domElement);
controls.target.set(32, 0, 32);
controls.update();

// Scene setup
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x80a0e0, 50, 100);
const world = new World();
world.generate();
scene.add(world);

// player
const player = new Player(scene);
// Physics
const physics = new Physics(scene);

const modelLoader = new ModelLoader();
modelLoader.loadModels((models) => {
	// Add the pickaxe to the player
	player.tool.setMesh(models.pickaxe);
});

// light
const sun = new THREE.DirectionalLight();

function setupLight() {
	sun.intensity = 3;
	sun.position.set(40, 40, 40);
	sun.castShadow = true;
	sun.shadow.camera.left = -50;
	sun.shadow.camera.right = 50;
	sun.shadow.camera.bottom = -50;
	sun.shadow.camera.top = 50;
	sun.shadow.camera.near = 0.1;
	sun.shadow.camera.far = 100;
	sun.shadow.bias = -0.0005;
	sun.shadow.mapSize = new THREE.Vector2(1024, 1024);
	scene.add(sun);
	scene.add(sun.target);

	const ambient = new THREE.AmbientLight();
	ambient.intensity = 0.1;
	scene.add(ambient);
}

function onMouseDown(event) {
	if (player.controls.isLocked && player.selectedCoords) {
		if (player.activeBlockId === blocks.empty.id) {
			// bug
			world.removeBlock(
				player.selectedCoords.x,
				player.selectedCoords.y,
				player.selectedCoords.z
			);
			player.tool.startAnimation();
		} else {
			world.addBlock(
				player.selectedCoords.x,
				player.selectedCoords.y,
				player.selectedCoords.z,
				player.activeBlockId
			);
		}
	}
}

document.addEventListener("mousedown", onMouseDown);

// Render loop
let previousTime = performance.now();
function animate() {
	const currentTime = performance.now();
	const dt = (currentTime - previousTime) / 1000;

	requestAnimationFrame(animate);
	if (player.controls.isLocked) {
		player.update(world);
		physics.update(dt, player, world);
		world.update(player);

		sun.position.copy(player.position);
		sun.position.add(new THREE.Vector3(40, 40, 40));
		sun.target.position.copy(player.position);
	}

	renderer.render(
		scene,
		player.controls.isLocked ? player.camera : orbitCamera
	);
	stats.update();

	previousTime = currentTime;
}

// resize window
window.addEventListener("resize", () => {
	orbitCamera.aspect = window.innerWidth / window.innerHeight;
	orbitCamera.updateProjectionMatrix();
	player.camera.aspect = window.innerWidth / window.innerHeight;
	player.camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});

setupLight();
createUI(scene, world, player);
animate();
