import { GLTFLoader } from "three/examples/jsm/Addons.js";

export class ModelLoader {
	loader = new GLTFLoader();

	models = {
		pickaxe: undefined,
	};

	/**
	 * Load the 3D models into memory
	 * @param {(object) => ()} onLoad
	 */
	loadModels(onLoad) {
		this.loader.load("models/pickaxe.glb", (model) => {
			const mesh = model.scene;
			this.models.pickaxe = mesh;
			onLoad(this.models);
		});
	}
}
