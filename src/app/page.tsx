"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { initialsCoordinates } from "./initials";

const gridCellWidth = 50;

const planeWidth = 1000;

const timeInterval = 50;

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let animatedVoxels: number[] = [];
const objects: Record<number, THREE.Mesh> = {};
let cubeGeo: THREE.BoxGeometry;
let cubeMaterial: THREE.MeshLambertMaterial;
let controls: OrbitControls;

let animateTimeout: NodeJS.Timeout | undefined;

let direction: "forwards" | "backwards" = "forwards";
let currentInitialsIndex = 0;
let currentVoxelIndex = 0;

function render() {
  renderer.render(scene, camera);
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isAnimationStopped, setIsAnimationStopped] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === undefined) return;

    let pointer: THREE.Vector2;
    let raycaster: THREE.Raycaster;
    let isShiftDown = false;

    let rollOverMesh: THREE.Mesh;
    let rollOverMaterial: THREE.MeshBasicMaterial;

    let plane: THREE.Mesh;

    const init = () => {
      camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        10000
      );
      camera.position.set(500, 800, 1300);
      camera.lookAt(0, 0, 0);

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f0f0);

      // roll-over helpers

      const rollOverGeo = new THREE.BoxGeometry(50, 50, 50);
      rollOverMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        opacity: 0.5,
        transparent: true,
      });
      rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
      scene.add(rollOverMesh);

      // cubes

      const map = new THREE.TextureLoader().load(
        "/textures/square-outline-textured.png"
      );
      map.colorSpace = THREE.SRGBColorSpace;
      cubeGeo = new THREE.BoxGeometry(50, 50, 50);
      cubeMaterial = new THREE.MeshLambertMaterial({
        color: 0xfeb74c,
        map: map,
      });

      // grid

      const gridHelper = new THREE.GridHelper(
        planeWidth,
        planeWidth / gridCellWidth
      );
      scene.add(gridHelper);

      raycaster = new THREE.Raycaster();
      pointer = new THREE.Vector2();

      const geometry = new THREE.PlaneGeometry(planeWidth, planeWidth);
      geometry.rotateX(-Math.PI / 2);

      plane = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ visible: false })
      );
      objects[plane.id] = plane;
      scene.add(plane);

      // lights

      const ambientLight = new THREE.AmbientLight(0x606060, 3);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
      directionalLight.position.set(1, 0.75, 0.5).normalize();
      scene.add(directionalLight);

      renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);

      controls = new OrbitControls(camera, renderer.domElement);

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerdown", onPointerDown);
      document.addEventListener("keydown", onDocumentKeyDown);
      document.addEventListener("keyup", onDocumentKeyUp);

      window.addEventListener("resize", onWindowResize);
    };

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);

      render();
    }

    function onPointerMove(event: PointerEvent) {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      pointer.set(x, y);

      raycaster.setFromCamera(pointer, camera);
      const objectsArray = Object.values(objects);

      const intersects = raycaster.intersectObjects(objectsArray, false);

      if (intersects.length > 0) {
        const intersect = intersects[0];
        if (!intersect.face) return;

        rollOverMesh.position.copy(intersect.point).add(intersect.face.normal);
        rollOverMesh.position
          .divideScalar(gridCellWidth)
          .floor()
          .multiplyScalar(gridCellWidth)
          .addScalar(gridCellWidth / 2);

        render();
      }
    }

    function onPointerDown(event: PointerEvent) {
      // calculate pointer position in normalized device coordinates
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      pointer.set(x, y);

      raycaster.setFromCamera(pointer, camera);

      const objectsArray = Object.values(objects);

      const intersects = raycaster.intersectObjects(objectsArray, false);

      if (intersects.length > 0) {
        const intersect = intersects[0];
        if (!intersect.face) return;

        // delete cube
        if (isShiftDown) {
          if (intersect.object !== plane) {
            scene.remove(intersect.object);
            delete objects[intersect.object.id];
            animatedVoxels = animatedVoxels.filter(
              (id) => id !== intersect.object.id
            );
          }

          // create cube
        } else {
          const voxel = new THREE.Mesh(cubeGeo, cubeMaterial);
          voxel.position.copy(intersect.point).add(intersect.face.normal);
          voxel.position
            .divideScalar(gridCellWidth)
            .floor()
            .multiplyScalar(gridCellWidth)
            .addScalar(gridCellWidth / 2);
          scene.add(voxel);

          objects[voxel.id] = voxel;
        }

        render();
      }
    }

    function animate() {
      requestAnimationFrame(animate);

      // required if controls.enableDamping or controls.autoRotate are set to true
      controls.update();

      renderer.render(scene, camera);
    }

    function onDocumentKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case "Shift":
          isShiftDown = true;
          break;
      }
    }

    function onDocumentKeyUp(event: KeyboardEvent) {
      switch (event.key) {
        case "Shift":
          isShiftDown = false;
          break;
      }
    }

    init();
    animate();

    render();
  }, []);

  useEffect(() => {
    if (isAnimationStopped) return;

    function animateNames() {
      const currentName = initialsCoordinates[currentInitialsIndex];
      if (
        direction === "forwards" &&
        currentVoxelIndex < currentName.length &&
        currentVoxelIndex > -1
      ) {
        const currentCoordinate = currentName[currentVoxelIndex];
        const voxel = new THREE.Mesh(cubeGeo, cubeMaterial);
        voxel.position.set(
          currentCoordinate.x * gridCellWidth,
          currentCoordinate.y * gridCellWidth,
          (currentCoordinate.z - 1) * gridCellWidth
        );
        voxel.position
          .divideScalar(gridCellWidth)
          .floor()
          .multiplyScalar(gridCellWidth)
          .addScalar(gridCellWidth / 2);
        scene.add(voxel);
        objects[voxel.id] = voxel;
        animatedVoxels.push(voxel.id);
        render();

        currentVoxelIndex++;
        animateTimeout = setTimeout(animateNames, timeInterval);
        return;
      }
      if (
        direction === "backwards" &&
        currentVoxelIndex > -1 &&
        currentVoxelIndex < currentName.length
      ) {
        const voxelId = animatedVoxels.pop();
        if (voxelId) {
          const voxel = objects[voxelId];
          if (voxel) {
            scene.remove(voxel);
            delete objects[voxel.id];
            render();
          }
        }

        currentVoxelIndex--;
        animateTimeout = setTimeout(animateNames, timeInterval);
        return;
      }
      if (currentVoxelIndex === currentName.length) {
        direction = "backwards";
        currentVoxelIndex--;
        animateTimeout = setTimeout(animateNames, timeInterval);
        return;
      }
      if (direction === "backwards" && currentVoxelIndex <= -1) {
        direction = "forwards";
        if (currentInitialsIndex === initialsCoordinates.length - 1) {
          currentVoxelIndex = 0;
          currentInitialsIndex = 0;
        } else {
          currentInitialsIndex += 1;
          currentVoxelIndex = 0;
        }
        animateTimeout = setTimeout(animateNames, timeInterval);
        return;
      }
    }

    animateNames();
  }, [isAnimationStopped]);

  const handleAnimationToggle = () => {
    // To stop animation
    if (!isAnimationStopped) {
      clearTimeout(animateTimeout);
    }
    setIsAnimationStopped((prev) => !prev);
  };

  return (
    <div className="w-screen h-screen">
      <div
        id="info"
        className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center"
      >
        <p className="text-center">
          My Initials: AO, my girlfriend{"'"}s initials JA, my mum{"'"}s
          initials: OO, animated with boxes on a grid.
        </p>
        <p className="text-center">
          Derived from{" "}
          <a
            href="https://threejs.org/examples/webgl_interactive_voxelpainter.html"
            target="_blank"
            rel="noopener"
            className="underline"
          >
            Three.js voxel painter
          </a>
        </p>
        <p className="">
          <strong>click</strong>: add voxel, <strong>shift + click</strong>:
          remove voxel
        </p>
        <button
          className="ml-2 bg-blue-600 text-white px-2 py-1 rounded cursor-pointer"
          onClick={handleAnimationToggle}
        >
          {isAnimationStopped ? "Continue" : "Pause"}
        </button>
      </div>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
