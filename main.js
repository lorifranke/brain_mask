import {
  WebGLRenderer,
  PCFSoftShadowMap,
  sRGBEncoding,
  Scene,
  SpotLight,
  PerspectiveCamera,
  HemisphereLight,
  AmbientLight,
  IcosahedronGeometry,
  OrthographicCamera,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  TextureLoader,
  MeshStandardMaterial,
} from "./third_party/three.module.js";
import * as THREE from "./third_party/three.module.js";
import { FaceMeshFaceGeometry } from "./js/face.js";
import { OrbitControls } from "./third_party/OrbitControls.js";
// import { STLLoader } from "./third_party/STLLoader.js";
import { STLLoader } from 'https://cdn.jsdelivr.net/npm/three@0.120.1/examples/jsm/loaders/STLLoader.js';
const av = document.querySelector("gum-av");
const canvas = document.querySelector("canvas");
const status = document.querySelector("#status");

// Set a background color, or change alpha to false for a solid canvas.
const renderer = new WebGLRenderer({ antialias: true, alpha: true, canvas });
// renderer.setClearColor(0x202020);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
renderer.outputEncoding = sRGBEncoding;

const scene = new Scene();
const camera = new OrthographicCamera(1, 1, 1, 1, -1000, 1000);

// Change to renderer.render(scene, debugCamera); for interactive view.
const debugCamera = new PerspectiveCamera(75, 1, 0.1, 1000);
debugCamera.position.set(300, 300, 300);
debugCamera.lookAt(scene.position);
const controls = new OrbitControls(debugCamera, renderer.domElement);

let width = 0;
let height = 0;
let brain;

function resize() {
  const videoAspectRatio = width / height;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const windowAspectRatio = windowWidth / windowHeight;
  let adjustedWidth;
  let adjustedHeight;
  if (videoAspectRatio > windowAspectRatio) {
    adjustedWidth = windowWidth;
    adjustedHeight = windowWidth / videoAspectRatio;
  } else {
    adjustedWidth = windowHeight * videoAspectRatio;
    adjustedHeight = windowHeight;
  }
  renderer.setSize(adjustedWidth, adjustedHeight);
  debugCamera.aspect = videoAspectRatio;
  debugCamera.updateProjectionMatrix();
}

window.addEventListener("resize", () => {
  resize();
});
resize();
renderer.render(scene, camera);
const loader = new STLLoader();

// Create a new geometry helper.
const faceGeometry = new FaceMeshFaceGeometry();

// Add lights.
const spotLight = new SpotLight(0xffffbb, 1);
spotLight.position.set(0.5, 0.5, 1);
spotLight.position.multiplyScalar(400);
scene.add(spotLight);

const hemiLight = new HemisphereLight(0xffffbb, 0x080820, 0.25);
scene.add(hemiLight);

const ambientLight = new AmbientLight(0x404040, 0.25);
scene.add(ambientLight);

let brainLoaded = new Promise((resolve, reject) => {
  loader.load("./assets/gm.stl", (geometry) => {
    const material = new MeshStandardMaterial({ color: 0xffc0cb });
    const mesh = new Mesh(geometry, material);
    geometry.center();
    brain = mesh;
    scene.add(brain);
    resolve();
  }, undefined, reject);
});

// Defines if the source should be flipped horizontally.
let flipCamera = true;

async function render(model) {
  // Wait for video to be ready (loadeddata).
  await av.ready();

  // Flip video element horizontally if necessary.
  av.video.style.transform = flipCamera ? "scaleX(-1)" : "scaleX(1)";

  // Resize orthographic camera to video dimensions if necessary.
  if (width !== av.video.videoWidth || height !== av.video.videoHeight) {
    const w = av.video.videoWidth;
    const h = av.video.videoHeight;
    camera.left = -0.5 * w;
    camera.right = 0.5 * w;
    camera.top = 0.5 * h;
    camera.bottom = -0.5 * h;
    camera.updateProjectionMatrix();
    width = w;
    height = h;
    resize();
    faceGeometry.setSize(w, h);
  }

  // Wait for the model to return a face.
  const faces = await model.estimateFaces(av.video, false, flipCamera);

  av.style.opacity = 1;
  status.textContent = "";

  // There's at least one face.
  if (faces.length > 0) {
    // Update face mesh geometry with new data.
    faceGeometry.update(faces[0], flipCamera);
    if (brain) {
      const track = faceGeometry.track(9, 55, 285);
      brain.position.set(track.position.x, track.position.y, track.position.z);
      brain.rotation.setFromRotationMatrix(track.rotation);
      brain.rotation.x = -Math.PI / 2;
    }
  }

    // Render the scene normally.
    renderer.render(scene, camera);

  requestAnimationFrame(() => render(model));
}

// Init the demo, loading dependencies.
async function init() {
  await Promise.all([tf.setBackend("webgl"), av.ready()]);
  status.textContent = "Loading model...";
  const model = await facemesh.load({ maxFaces: 1 });
  status.textContent = "Detecting face...";
  render(model);
}

init();
