"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const initialsCoordinates: { x: number; y: number; z: number }[] = [
  { x: -10, y: 0, z: 7 },
  { x: -10, y: 0, z: 6 },
  { x: -10, y: 0, z: 5 },
  { x: -10, y: 0, z: 4 },
  { x: -10, y: 0, z: 3 },
  { x: -10, y: 0, z: 2 },
  { x: -9, y: 0, z: 1 },
  { x: -9, y: 0, z: 0 },
  { x: -8, y: 0, z: -1 },
  { x: -8, y: 0, z: -2 },
  { x: -7, y: 0, z: -2 },
  { x: -6, y: 0, z: -2 },
  { x: -5, y: 0, z: -1 },
  { x: -4, y: 0, z: -0 },
  { x: -4, y: 0, z: 1 },
  { x: -3, y: 0, z: 2 },
];

const gridCellWidth = 50;

const planeWidth = 1000;

const timeInterval = 200;

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === undefined) return;

    let camera: THREE.PerspectiveCamera;
    let scene: THREE.Scene;
    let renderer: THREE.WebGLRenderer;
    let pointer: THREE.Vector2;
    let raycaster: THREE.Raycaster;
    let isShiftDown = false;

    let rollOverMesh: THREE.Mesh;
    let rollOverMaterial: THREE.MeshBasicMaterial;
    let cubeGeo: THREE.BoxGeometry;
    let cubeMaterial: THREE.MeshLambertMaterial;
    let plane: THREE.Mesh;
    const objects: THREE.Mesh[] = [];

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
      scene.add(plane);

      objects.push(plane);

      // lights

      const ambientLight = new THREE.AmbientLight(0x606060, 3);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
      directionalLight.position.set(1, 0.75, 0.5).normalize();
      scene.add(directionalLight);

      renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      // document.body.appendChild(renderer.domElement);

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerdown", onPointerDown);
      document.addEventListener("keydown", onDocumentKeyDown);
      document.addEventListener("keyup", onDocumentKeyUp);

      //

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

      const intersects = raycaster.intersectObjects(objects, false);

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

      const intersects = raycaster.intersectObjects(objects, false);

      if (intersects.length > 0) {
        const intersect = intersects[0];
        if (!intersect.face) return;

        // delete cube
        if (isShiftDown) {
          if (intersect.object !== plane) {
            scene.remove(intersect.object);
            if (!intersect.object)
              objects.splice(objects.indexOf(intersect.object), 1);
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

          objects.push(voxel);
        }

        render();
      }
    }

    function onDocumentKeyDown(event: KeyboardEvent) {
      switch (event.keyCode) {
        case 16:
          isShiftDown = true;
          break;
      }
    }

    function onDocumentKeyUp(event: KeyboardEvent) {
      switch (event.keyCode) {
        case 16:
          isShiftDown = false;
          break;
      }
    }

    function render() {
      renderer.render(scene, camera);
    }

    init();

    let animatedCoordinates: (typeof initialsCoordinates)[number][] = [];

    const animateName = () => {
      const addName = () => {
        initialsCoordinates.forEach((coordinate, index) => {
          const voxel = new THREE.Mesh(cubeGeo, cubeMaterial);
          voxel.position.set(
            coordinate.x * gridCellWidth,
            coordinate.y * gridCellWidth,
            (coordinate.z - 1) * gridCellWidth
          );
          voxel.position
            .divideScalar(gridCellWidth)
            .floor()
            .multiplyScalar(gridCellWidth)
            .addScalar(gridCellWidth / 2);
          setTimeout(() => {
            scene.add(voxel);
            render();
          }, timeInterval * index);

          objects.push(voxel);
          animatedCoordinates.unshift(coordinate);
        });
      };

      const removeName = () => {
        animatedCoordinates.forEach((coordinate, index) => {
          const voxel = objects.find((object) => {
            const position = new THREE.Vector3(
              coordinate.x * gridCellWidth,
              coordinate.y * gridCellWidth,
              (coordinate.z - 1) * gridCellWidth
            )
              .divideScalar(gridCellWidth)
              .ceil()
              .multiplyScalar(gridCellWidth)
              .addScalar(gridCellWidth / 2);
            return object.position.equals(position);
          });
          if (voxel) {
            setTimeout(() => {
              scene.remove(voxel);
              objects.splice(objects.indexOf(voxel), 1);
              render();
            }, timeInterval * index);
          }
        });
        animatedCoordinates = [];
      };

      addName();

      setTimeout(() => {
        removeName();
      }, timeInterval * initialsCoordinates.length);
    };

    setTimeout(() => {
      animateName();
      setInterval(() => {
        animateName();
      }, timeInterval * initialsCoordinates.length * 2);
    }, timeInterval);

    render();
  }, []);

  return (
    <div className="w-screen h-screen">
      <div id="info" className="absolute top-2 left-2">
        My Initials AO, animated with boxes on a grid. Inspired by{" "}
        <a
          href="https://threejs.org/examples/webgl_interactive_voxelpainter.html"
          target="_blank"
          rel="noopener"
        >
          Three.js voxel painter
        </a>
        <br />
        <strong>click</strong>: add voxel, <strong>shift + click</strong>:
        remove voxel
      </div>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
