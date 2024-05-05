import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/Addons.js";
import { World } from "./world";
import { blocks } from "./blocks";
import { Tool } from "./tool";

const CENTER_SCREEN = new THREE.Vector2();

export class Player {
	radius = 0.5;
	height = 1.75;
	jumpSpeed = 10;
	onGround = false;
	maxSpeed = 10;
	input = new THREE.Vector3();
	velocity = new THREE.Vector3();
	#worldVelocity = new THREE.Vector3();

	camera = new THREE.PerspectiveCamera(
		70,
		window.innerWidth / window.innerHeight,
		0.1,
		200
	);
	controls = new PointerLockControls(this.camera, document.body);
	cameraHelper = new THREE.CameraHelper(this.camera);

	raycaster = new THREE.Raycaster(
		new THREE.Vector3(),
		new THREE.Vector3(),
		0,
		3
	);
	selectedCoords = null;
	activeBlockId = blocks.empty.id;
	tool = new Tool();
	/**
	 * @param {THREE.Scene} scene
	 */
	constructor(scene) {
		this.camera.position.set(16, 16, 16);
		this.camera.layers.enable(1);
		scene.add(this.camera);
		// scene.add(this.cameraHelper);
		this.camera.add(this.tool);

		document.addEventListener("keydown", (event) => this.onKeyDown(event));
		document.addEventListener("keyup", (event) => this.onKeyUp(event));

		// Wireframe mesh visualizing the player's bounding cylinder
		this.boundsHelper = new THREE.Mesh(
			new THREE.CylinderGeometry(this.radius, this.radius, this.height, 16),
			new THREE.MeshBasicMaterial({ wireframe: true })
		);
		this.updateBoundsHelper.visible = false;
		// scene.add(this.boundsHelper);

		const selectionMaterial = new THREE.MeshBasicMaterial({
			transparent: true,
			opacity: 0.3,
			color: 0xffffaa,
		});
		const selectionGeometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
		this.selectionHelper = new THREE.Mesh(selectionGeometry, selectionMaterial);
		scene.add(this.selectionHelper);

		this.raycaster.layers.set(0);
	}

	/**
	 * Returns the velocity of the player in the world coordinates
	 * @returns {THREE.Vector3}
	 */
	get worldVelocity() {
		this.#worldVelocity.copy(this.velocity);
		this.#worldVelocity.applyEuler(
			new THREE.Euler(0, this.camera.rotation.y, 0)
		);
		return this.#worldVelocity;
	}

	/**
	 * Updates the player state
	 * @param {World} world
	 */
	update(world) {
		this.updateRaycaster(world);
		this.tool.update();
	}

	/**
	 * Updates the raycaster use for picking blocks
	 * @param {World} world
	 */
	updateRaycaster(world) {
		this.raycaster.setFromCamera(CENTER_SCREEN, this.camera);
		const intersections = this.raycaster.intersectObject(world, true);

		if (intersections.length > 0) {
			const intersection = intersections[0];

			// Get the position of the chunk that the block is contained
			const chunk = intersection.object.parent;

			// Get transformation matrix of the intersected block
			const blockMatrix = new THREE.Matrix4();
			intersection.object.getMatrixAt(intersection.instanceId, blockMatrix);

			// Extract the position from the block's transformation matrix
			// and store it in selectedCoords
			this.selectedCoords = chunk.position.clone();
			this.selectedCoords.applyMatrix4(blockMatrix);

			// If we are adding a block to the world, move the selection indicator
			// to the nearest adjacent block
			if (this.activeBlockId !== blocks.empty.id) {
				this.selectedCoords.add(intersection.normal);
			}

			this.selectionHelper.position.copy(this.selectedCoords);
			this.selectionHelper.visible = true;
		} else {
			this.selectedCoords = null;
			this.selectionHelper.visible = false;
		}
	}

	/**
	 * Applies a change in velocity 'dv' that is specified in the world frame
	 * @param {THREE.Vector3} dv
	 */
	applyWorldDeltaVelocity(dv) {
		dv.applyEuler(new THREE.Euler(0, -this.camera.rotation.y, 0));
		this.velocity.add(dv);
	}

	applyInputs(dt) {
		if (this.controls.isLocked) {
			this.velocity.x = this.input.x;
			this.velocity.z = this.input.z;
			this.controls.moveRight(this.velocity.x * dt);
			this.controls.moveForward(this.velocity.z * dt);
			this.position.y += this.velocity.y * dt;

			document.getElementById("player-position").innerHTML = this.toString();
		}
	}

	/**
	 * Updates the position of the player's bounding cylinder helper
	 */
	updateBoundsHelper() {
		this.boundsHelper.position.copy(this.position);
		this.boundsHelper.position.y -= this.height / 2;
	}

	/**
	 * Return the current world position of the player
	 * @type {THREE.Vector3}
	 */
	get position() {
		return this.camera.position;
	}

	/**
	 * Event handler for 'keydown' event
	 * @param {KeyboardEvent} event
	 */
	onKeyDown(event) {
		if (!this.controls.isLocked) {
			this.controls.lock();
		}

		switch (event.key) {
			case "0":
			case "1":
			case "2":
			case "3":
			case "4":
			case "5":
			case "6":
			case "7":
			case "8":
				document
					.getElementById(`toolbar-${this.activeBlockId}`)
					.classList.remove("selected");
				this.activeBlockId = Number(event.key);
				document
					.getElementById(`toolbar-${this.activeBlockId}`)
					.classList.add("selected");

				// Only show the tool when it is currently active
				this.tool.visible = this.activeBlockId === blocks.empty.id;
				break;
			case "w":
				this.input.z = this.maxSpeed;
				break;
			case "s":
				this.input.z = -this.maxSpeed;
				break;
			case "a":
				this.input.x = -this.maxSpeed;
				break;
			case "d":
				this.input.x = this.maxSpeed;
				break;
			case "r":
				this.position.set(32, 32, 32);
				this.velocity.set(0, 0, 0);
			case " ":
				if (this.onGround) {
					this.velocity.y += this.jumpSpeed;
				}
				break;
		}
	}

	/**
	 * Event handler for 'keyup' event
	 * @param {KeyboardEvent} event
	 */
	onKeyUp(event) {
		switch (event.key) {
			case "w":
				this.input.z = 0;
				break;
			case "s":
				this.input.z = 0;
				break;
			case "a":
				this.input.x = 0;
				break;
			case "d":
				this.input.x = 0;
				break;
		}
	}

	/**
	 * Returns player position in a readable string form
	 * @return {string}
	 */
	toString() {
		let str = ``;
		str += `X: ${this.position.x.toFixed(3)} `;
		str += `Y: ${this.position.y.toFixed(3)} `;
		str += `Z: ${this.position.z.toFixed(3)}`;
		return str;
	}
}
