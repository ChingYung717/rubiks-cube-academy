import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  CUBE_COLOR_HEX,
  CubeColor,
  Cubie,
  FaceDir,
  applyMove,
  getMoveDefinition,
} from '../engine/cubeEngine';
import { Compass, Eye, RotateCcw, Sparkles } from 'lucide-react';

export interface ActiveAnimation {
  id: number;
  fromCube: Cubie[];
  moveToken: string;
  durationMs: number;
  onFinish: () => void;
}

interface Cube3DStageProps {
  cube: Cubie[];
  activeAnimation: ActiveAnimation | null;
  hintMoveToken: string | null;
  focusMode: boolean;
  show3DArrows: boolean;
  isCubieFocused: (cubie: Cubie) => boolean;
  onUserMove: (moveToken: string) => void;
  modeBadgeText?: string;
  fallback: React.ReactNode;
  onWebGLUnavailable: () => void;
}

interface CubieMeshRecord {
  group: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  stickers: Record<FaceDir, THREE.MeshStandardMaterial>;
}

const FACE_NORMALS: Record<FaceDir, THREE.Vector3> = {
  R: new THREE.Vector3(1, 0, 0),
  L: new THREE.Vector3(-1, 0, 0),
  U: new THREE.Vector3(0, 1, 0),
  D: new THREE.Vector3(0, -1, 0),
  F: new THREE.Vector3(0, 0, 1),
  B: new THREE.Vector3(0, 0, -1),
};

export interface StagePointerDomElement {
  getBoundingClientRect: () => { left: number; top: number; width: number; height: number };
  clientWidth: number;
  clientHeight: number;
  setPointerCapture?: (pointerId: number) => void;
  hasPointerCapture?: (pointerId: number) => boolean;
  releasePointerCapture?: (pointerId: number) => void;
}

export interface StageCameraSpherical {
  radius: number;
  theta: number;
  phi: number;
  targetTheta: number;
  targetPhi: number;
}

export function createStagePointerHandlers(params: {
  domElement: StagePointerDomElement;
  camera: THREE.PerspectiveCamera;
  rootGroup: THREE.Group;
  cameraSpherical: StageCameraSpherical;
  isAnimating: () => boolean;
  onRequestRender: () => void;
  onUserMove: (moveToken: string) => void;
}) {
  const {
    domElement,
    camera,
    rootGroup,
    cameraSpherical,
    isAnimating,
    onRequestRender,
    onUserMove,
  } = params;

  const raycaster = new THREE.Raycaster();
  let pointerState: {
    pointerId: number;
    mode: 'orbit' | 'sticker';
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    cubiePos?: [number, number, number];
    faceDir?: FaceDir;
    hitPoint?: THREE.Vector3;
    moveTriggered?: boolean;
  } | null = null;

  const getEventPointerId = (e: Pick<PointerEvent, 'pointerId'>): number =>
    typeof e.pointerId === 'number' ? e.pointerId : 0;

  const getNormalizedMouse = (clientX: number, clientY: number) => {
    const rect = domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
  };

  const capturePointer = (pointerId: number) => {
    try {
      domElement.setPointerCapture?.(pointerId);
    } catch {
      // ignore synthetic events where pointerId is not active
    }
  };

  const releaseCapturedPointer = (pointerId: number) => {
    try {
      if (domElement.hasPointerCapture?.(pointerId)) {
        domElement.releasePointerCapture?.(pointerId);
      }
    } catch {
      // ignore
    }
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (pointerState !== null) {
      return;
    }
    const pointerId = getEventPointerId(e);
    capturePointer(pointerId);
    if (typeof e.button === 'number' && e.button !== 0) {
      pointerState = {
        pointerId,
        mode: 'orbit',
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
      };
      return;
    }

    const mouse = getNormalizedMouse(e.clientX, e.clientY);
    raycaster.setFromCamera(mouse, camera);

    const allMeshes: THREE.Object3D[] = [];
    rootGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && obj.userData?.faceDir) {
        allMeshes.push(obj);
      }
    });

    const hits = raycaster.intersectObjects(allMeshes, false);
    if (hits.length > 0 && !isAnimating()) {
      const hitObj = hits[0].object;
      const faceDir = hitObj.userData.faceDir as FaceDir;
      const parentGroup = hitObj.parent;
      const cubiePos = parentGroup?.userData?.pos as [number, number, number] | undefined;
      if (faceDir && cubiePos) {
        pointerState = {
          pointerId,
          mode: 'sticker',
          startX: e.clientX,
          startY: e.clientY,
          lastX: e.clientX,
          lastY: e.clientY,
          cubiePos,
          faceDir,
          hitPoint: hits[0].point.clone(),
          moveTriggered: false,
        };
        return;
      }
    }

    pointerState = {
      pointerId,
      mode: 'orbit',
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
    };
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!pointerState || getEventPointerId(e) !== pointerState.pointerId) return;
    if (e.isTrusted && e.pointerType === 'mouse' && e.buttons === 0) {
      const activePointerId = pointerState.pointerId;
      pointerState = null;
      releaseCapturedPointer(activePointerId);
      return;
    }

    if (pointerState.mode === 'orbit') {
      const dx = e.clientX - pointerState.lastX;
      const dy = e.clientY - pointerState.lastY;
      if (dx === 0 && dy === 0) return;
      pointerState.lastX = e.clientX;
      pointerState.lastY = e.clientY;

      cameraSpherical.targetTheta -= dx * 0.0075;
      cameraSpherical.targetPhi = Math.max(
        0.22,
        Math.min(Math.PI - 0.22, cameraSpherical.targetPhi - dy * 0.0075)
      );
      onRequestRender();
      return;
    }

    if (pointerState.mode === 'sticker' && !pointerState.moveTriggered) {
      const dx = e.clientX - pointerState.startX;
      const dy = e.clientY - pointerState.startY;
      const dist = Math.hypot(dx, dy);
      if (dist < 16) return;

      pointerState.moveTriggered = true;
      const { cubiePos, faceDir, hitPoint } = pointerState;
      if (!cubiePos || !faceDir) return;

      const normal = FACE_NORMALS[faceDir];
      // Candidate world tangent axes perpendicular to face normal
      const allWorldAxes: { vec: THREE.Vector3; name: 'x' | 'y' | 'z' }[] = [
        { vec: new THREE.Vector3(1, 0, 0), name: 'x' },
        { vec: new THREE.Vector3(0, 1, 0), name: 'y' },
        { vec: new THREE.Vector3(0, 0, 1), name: 'z' },
      ];
      const worldAxes = allWorldAxes.filter((a) => Math.abs(a.vec.dot(normal)) < 0.1);

      const anchorPoint =
        hitPoint ??
        new THREE.Vector3(...cubiePos).add(normal.clone().multiplyScalar(0.472));

      let bestAxis = worldAxes[0];
      let bestSign = 1;
      let resolvedViaPlane = false;

      // Primary method: intersect current pointer ray with the exact 3D sticker plane
      const mouseNow = getNormalizedMouse(e.clientX, e.clientY);
      raycaster.setFromCamera(mouseNow, camera);
      if (Math.abs(raycaster.ray.direction.dot(normal)) > 0.18) {
        const stickerPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
          normal,
          anchorPoint
        );
        const planeHit = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(stickerPlane, planeHit)) {
          const delta3D = planeHit.sub(anchorPoint);
          const comp0 = delta3D.dot(worldAxes[0].vec);
          const comp1 = delta3D.dot(worldAxes[1].vec);
          if (Math.hypot(comp0, comp1) > 0.02) {
            if (Math.abs(comp0) >= Math.abs(comp1)) {
              bestAxis = worldAxes[0];
              bestSign = comp0 >= 0 ? 1 : -1;
            } else {
              bestAxis = worldAxes[1];
              bestSign = comp1 >= 0 ? 1 : -1;
            }
            resolvedViaPlane = true;
          }
        }
      }

      // Fallback for extreme grazing angles: differential screen projection at anchorPoint
      if (!resolvedViaPlane) {
        const projectDelta = (dirVec: THREE.Vector3) => {
          const p0 = anchorPoint.clone().project(camera);
          const p1 = anchorPoint
            .clone()
            .add(dirVec.clone().multiplyScalar(0.25))
            .project(camera);
          return new THREE.Vector2(
            (p1.x - p0.x) * domElement.clientWidth * 0.5,
            -(p1.y - p0.y) * domElement.clientHeight * 0.5
          ).normalize();
        };

        const dragVec = new THREE.Vector2(dx, dy).normalize();
        let bestScore = -1;

        for (const candidate of worldAxes) {
          const screenDir = projectDelta(candidate.vec);
          const dot = dragVec.dot(screenDir);
          if (Math.abs(dot) > bestScore) {
            bestScore = Math.abs(dot);
            bestAxis = candidate;
            bestSign = dot >= 0 ? 1 : -1;
          }
        }
      }

      // Tangential motion vector T = bestSign * bestAxis.vec
      // Rotation torque vector = normal x T
      const tangentVec = bestAxis.vec.clone().multiplyScalar(bestSign);
      const torqueVec = new THREE.Vector3().crossVectors(normal, tangentVec);

      let rotAxis: 'x' | 'y' | 'z' = 'x';
      let quarterTurnSign = 1;
      if (Math.abs(torqueVec.x) > 0.5) {
        rotAxis = 'x';
        quarterTurnSign = torqueVec.x > 0 ? 1 : -1;
      } else if (Math.abs(torqueVec.y) > 0.5) {
        rotAxis = 'y';
        quarterTurnSign = torqueVec.y > 0 ? 1 : -1;
      } else {
        rotAxis = 'z';
        quarterTurnSign = torqueVec.z > 0 ? 1 : -1;
      }

      const layerVal =
        rotAxis === 'x' ? cubiePos[0] : rotAxis === 'y' ? cubiePos[1] : cubiePos[2];

      // Map (rotAxis, layerVal, quarterTurnSign) to standard move token
      let moveToken: string | null = null;
      if (rotAxis === 'x') {
        if (layerVal === 1) moveToken = quarterTurnSign === -1 ? 'R' : "R'";
        else if (layerVal === -1) moveToken = quarterTurnSign === 1 ? 'L' : "L'";
        else moveToken = quarterTurnSign === 1 ? 'M' : "M'";
      } else if (rotAxis === 'y') {
        if (layerVal === 1) moveToken = quarterTurnSign === -1 ? 'U' : "U'";
        else if (layerVal === -1) moveToken = quarterTurnSign === 1 ? 'D' : "D'";
        else moveToken = quarterTurnSign === 1 ? 'E' : "E'";
      } else {
        if (layerVal === 1) moveToken = quarterTurnSign === -1 ? 'F' : "F'";
        else if (layerVal === -1) moveToken = quarterTurnSign === 1 ? 'B' : "B'";
        else moveToken = quarterTurnSign === -1 ? 'S' : "S'";
      }

      if (moveToken) {
        onUserMove(moveToken);
      }
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!pointerState || getEventPointerId(e) !== pointerState.pointerId) return;
    const activePointerId = pointerState.pointerId;
    pointerState = null;
    if (e.type !== 'lostpointercapture') {
      releaseCapturedPointer(activePointerId);
    }
  };

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    getActivePointerId: () => pointerState?.pointerId ?? null,
  };
}

const CAMERA_PRESETS: { label: string; theta: number; phi: number }[] = [
  { label: '标准教学视角 (U-F-R)', theta: Math.PI / 4.2, phi: Math.PI / 3.1 },
  { label: '左前视角 (U-F-L)', theta: -Math.PI / 4.2, phi: Math.PI / 3.1 },
  { label: '俯视顶层 (U - OLL/PLL)', theta: Math.PI / 6, phi: Math.PI / 5.2 },
  { label: '仰视底层 (D - 白十字)', theta: Math.PI / 4.2, phi: (Math.PI * 2.15) / 3 },
  { label: '后视车灯 (B - 背面)', theta: Math.PI + Math.PI / 5, phi: Math.PI / 3.1 },
];

export const Cube3DStage: React.FC<Cube3DStageProps> = React.memo(({
  cube,
  activeAnimation,
  hintMoveToken,
  focusMode,
  show3DArrows,
  isCubieFocused,
  onUserMove,
  modeBadgeText,
  fallback,
  onWebGLUnavailable,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [activePresetIdx, setActivePresetIdx] = useState(0);
  const [webGLUnavailable, setWebGLUnavailable] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);
  const contextLossCountRef = useRef(0);
  const needsRenderRef = useRef(true);

  // Refs for mutable state accessed inside requestAnimationFrame & pointer handlers
  const cubeRef = useRef<Cubie[]>(cube);
  cubeRef.current = cube;

  const focusModeRef = useRef(focusMode);
  focusModeRef.current = focusMode;

  const isCubieFocusedRef = useRef(isCubieFocused);
  isCubieFocusedRef.current = isCubieFocused;

  const onUserMoveRef = useRef(onUserMove);
  onUserMoveRef.current = onUserMove;

  const activeAnimRef = useRef<{
    id: number;
    fromCube: Cubie[];
    moveToken: string;
    durationMs: number;
    startTime: number;
    onFinish: () => void;
    started: boolean;
  } | null>(null);

  const cameraSphericalRef = useRef({
    radius: 7.4,
    theta: CAMERA_PRESETS[0].theta,
    phi: CAMERA_PRESETS[0].phi,
    targetTheta: CAMERA_PRESETS[0].theta,
    targetPhi: CAMERA_PRESETS[0].phi,
  });

  const sceneObjectsRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    rootGroup: THREE.Group;
    pivotGroup: THREE.Group;
    arrowGroup: THREE.Group;
    cubieMeshes: Map<string, CubieMeshRecord>;
  } | null>(null);

  // Helper to sync cubie mesh positions & materials from a logical Cubie[] state
  const syncCubieMeshes = (
    stateToRender: Cubie[],
    activeLayerFilter?: { axis: 'x' | 'y' | 'z'; layers: number[] } | null,
    attachToPivot = false
  ) => {
    const objs = sceneObjectsRef.current;
    if (!objs) return;
    const { rootGroup, pivotGroup, cubieMeshes } = objs;

    pivotGroup.rotation.set(0, 0, 0);

    for (const cubie of stateToRender) {
      const rec = cubieMeshes.get(cubie.id);
      if (!rec) continue;

      const axisIdx =
        activeLayerFilter?.axis === 'x' ? 0 : activeLayerFilter?.axis === 'y' ? 1 : 2;
      const inActiveLayer = Boolean(
        activeLayerFilter && activeLayerFilter.layers.includes(cubie.pos[axisIdx])
      );

      const targetParent = attachToPivot && inActiveLayer ? pivotGroup : rootGroup;
      if (rec.group.parent !== targetParent) {
        targetParent.add(rec.group);
      }

      rec.group.position.set(cubie.pos[0], cubie.pos[1], cubie.pos[2]);
      rec.group.rotation.set(0, 0, 0);
      rec.group.userData = {
        cubieId: cubie.id,
        pos: [...cubie.pos],
      };

      const focused = !focusModeRef.current || isCubieFocusedRef.current(cubie);
      rec.bodyMat.color.set(focused ? '#0b0f19' : '#080b12');
      rec.bodyMat.opacity = 1.0;
      rec.bodyMat.transparent = false;

      const dirs: FaceDir[] = ['U', 'D', 'R', 'L', 'F', 'B'];
      for (const dir of dirs) {
        const mat = rec.stickers[dir];
        const colorCode: CubeColor | undefined = cubie.faces[dir];
        if (colorCode) {
          mat.visible = true;
          if (focused) {
            mat.color.set(CUBE_COLOR_HEX[colorCode]);
            mat.emissive.set(CUBE_COLOR_HEX[colorCode]);
            mat.emissiveIntensity = inActiveLayer ? 0.24 : 0.08;
            mat.roughness = 0.16;
            mat.opacity = 1.0;
            mat.transparent = false;
          } else {
            // Solid matte slate-gray sticker in Focus Mode (no transparency depth artifacts)
            mat.color.set('#1e293b');
            mat.emissive.set('#0f172a');
            mat.emissiveIntensity = inActiveLayer ? 0.12 : 0.02;
            mat.roughness = 0.65;
            mat.opacity = 1.0;
            mat.transparent = false;
          }
        } else {
          mat.visible = false;
        }
      }
    }
    needsRenderRef.current = true;
  };

  const hintMoveTokenRef = useRef<string | null>(hintMoveToken);
  hintMoveTokenRef.current = hintMoveToken;

  const getActiveLayerFilterFromToken = (token: string | null) => {
    if (!token) return null;
    try {
      const def = getMoveDefinition(token);
      return { axis: def.axis, layers: def.layers };
    } catch {
      return null;
    }
  };

  // Helper to dispose all meshes inside arrowGroup without leaking GPU buffers
  const clearArrowGroup = (arrowGroup: THREE.Group) => {
    while (arrowGroup.children.length > 0) {
      const child = arrowGroup.children[0] as THREE.Mesh;
      arrowGroup.remove(child);
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  };

  // Helper to build 3D curved arrow + layer highlight ring for a move token
  const rebuild3DArrow = (token: string | null) => {
    const objs = sceneObjectsRef.current;
    if (!objs) return;
    const { arrowGroup } = objs;

    clearArrowGroup(arrowGroup);
    needsRenderRef.current = true;

    if (!token || !show3DArrows) return;

    let def;
    try {
      def = getMoveDefinition(token);
    } catch {
      return;
    }

    const axisVec =
      def.axis === 'x'
        ? new THREE.Vector3(1, 0, 0)
        : def.axis === 'y'
          ? new THREE.Vector3(0, 1, 0)
          : new THREE.Vector3(0, 0, 1);

    const avgLayer =
      def.layers.reduce((acc, v) => acc + v, 0) / Math.max(1, def.layers.length);
    const layerOffset = avgLayer * 1.02;

    // Choose a clearly visible starting point in the plane perpendicular to axisVec
    const radius = 2.28;
    let startVec: THREE.Vector3;
    if (def.axis === 'x') {
      // Plane YZ: start near Front-Up (+Y, +Z)
      if (def.quarterTurns < 0) {
        // R moves +Z -> +Y, so start on +Z and sweep up to +Y
        startVec = new THREE.Vector3(layerOffset, radius * 0.2, radius * 0.98);
      } else {
        startVec = new THREE.Vector3(layerOffset, radius * 0.98, radius * 0.2);
      }
    } else if (def.axis === 'y') {
      // Plane XZ: start near Front-Right (+X, +Z)
      if (def.quarterTurns < 0) {
        // U moves +Z -> -X
        startVec = new THREE.Vector3(radius * 0.65, layerOffset, radius * 0.76);
      } else {
        startVec = new THREE.Vector3(-radius * 0.65, layerOffset, radius * 0.76);
      }
    } else {
      // Plane XY: start near Up-Left/Right
      if (def.quarterTurns < 0) {
        // F moves +Y -> +X
        startVec = new THREE.Vector3(-radius * 0.25, radius * 0.96, layerOffset);
      } else {
        startVec = new THREE.Vector3(radius * 0.85, radius * 0.52, layerOffset);
      }
    }

    const isDouble = Math.abs(def.quarterTurns) === 2;
    const sweepAngle =
      Math.sign(def.quarterTurns) * (isDouble ? Math.PI * 0.78 : Math.PI * 0.48);

    const numPoints = 32;
    const curvePoints: THREE.Vector3[] = [];
    const centerOnAxis = axisVec.clone().multiplyScalar(layerOffset);

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const radial = startVec.clone().sub(centerOnAxis);
      radial.applyAxisAngle(axisVec, t * sweepAngle);
      curvePoints.push(centerOnAxis.clone().add(radial));
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.095, 14, false);
    const arrowColor = isDouble ? '#fbbf24' : '#22d3ee';
    const tubeMat = new THREE.MeshStandardMaterial({
      color: arrowColor,
      emissive: arrowColor,
      emissiveIntensity: 0.85,
      roughness: 0.15,
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    arrowGroup.add(tubeMesh);

    // Arrowhead cone at the end of the curve
    const endPoint = curvePoints[curvePoints.length - 1];
    const prevPoint = curvePoints[curvePoints.length - 2];
    const tangent = endPoint.clone().sub(prevPoint).normalize();

    const coneGeo = new THREE.ConeGeometry(0.24, 0.5, 18);
    const coneMat = new THREE.MeshStandardMaterial({
      color: arrowColor,
      emissive: arrowColor,
      emissiveIntensity: 0.95,
      roughness: 0.15,
    });
    const coneMesh = new THREE.Mesh(coneGeo, coneMat);
    coneMesh.position.copy(endPoint.clone().add(tangent.clone().multiplyScalar(0.14)));
    coneMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    arrowGroup.add(coneMesh);

    // Subtle glowing ring around the active layer
    for (const layerVal of def.layers) {
      const ringGeo = new THREE.RingGeometry(1.88, 1.95, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: arrowColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.28,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(axisVec.clone().multiplyScalar(layerVal));
      if (def.axis === 'x') {
        ringMesh.rotation.y = Math.PI / 2;
      } else if (def.axis === 'y') {
        ringMesh.rotation.x = Math.PI / 2;
      }
      arrowGroup.add(ringMesh);
    }
  };

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container || webGLUnavailable) return;

    const useFallback = () => {
      setWebGLUnavailable(true);
      onWebGLUnavailable();
    };
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    const initSph = cameraSphericalRef.current;
    camera.position.set(
      initSph.radius * Math.sin(initSph.phi) * Math.sin(initSph.theta),
      initSph.radius * Math.cos(initSph.phi),
      initSph.radius * Math.sin(initSph.phi) * Math.cos(initSph.theta)
    );
    camera.lookAt(0, 0, 0);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      useFallback();
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Lighting for crisp sticker colors
    const ambientLight = new THREE.AmbientLight('#ffffff', 1.35);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight('#ffffff', 1.6);
    keyLight.position.set(8, 12, 10);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#38bdf8', 0.55);
    fillLight.position.set(-9, -6, -7);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight('#f8fafc', 0.7);
    rimLight.position.set(0, -10, 6);
    scene.add(rimLight);

    // Subtle studio floor shadow grid
    const gridHelper = new THREE.GridHelper(12, 12, '#1e293b', '#0f172a');
    gridHelper.position.y = -2.85;
    scene.add(gridHelper);

    // Axis orientation badges floating slightly outside the cube
    const rootGroup = new THREE.Group();
    const pivotGroup = new THREE.Group();
    const arrowGroup = new THREE.Group();
    scene.add(rootGroup);
    scene.add(pivotGroup);
    scene.add(arrowGroup);

    // Create all 27 cubie mesh groups
    const cubieMeshes = new Map<string, CubieMeshRecord>();
    const bodyGeo = new THREE.BoxGeometry(0.93, 0.93, 0.93);
    const stickerGeo = new THREE.PlaneGeometry(0.8, 0.8);

    const initialCubies = cubeRef.current;
    for (const c of initialCubies) {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({
        color: '#0f172a',
        roughness: 0.35,
        metalness: 0.25,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      group.add(bodyMesh);

      const stickers = {} as Record<FaceDir, THREE.MeshStandardMaterial>;
      const faceConfigs: {
        dir: FaceDir;
        pos: [number, number, number];
        rot: [number, number, number];
      }[] = [
        { dir: 'U', pos: [0, 0.472, 0], rot: [-Math.PI / 2, 0, 0] },
        { dir: 'D', pos: [0, -0.472, 0], rot: [Math.PI / 2, 0, 0] },
        { dir: 'F', pos: [0, 0, 0.472], rot: [0, 0, 0] },
        { dir: 'B', pos: [0, 0, -0.472], rot: [0, Math.PI, 0] },
        { dir: 'R', pos: [0.472, 0, 0], rot: [0, Math.PI / 2, 0] },
        { dir: 'L', pos: [-0.472, 0, 0], rot: [0, -Math.PI / 2, 0] },
      ];

      for (const cfg of faceConfigs) {
        const sMat = new THREE.MeshStandardMaterial({
          color: '#ffffff',
          roughness: 0.18,
          metalness: 0.06,
          side: THREE.FrontSide,
        });
        const sMesh = new THREE.Mesh(stickerGeo, sMat);
        sMesh.position.set(...cfg.pos);
        sMesh.rotation.set(...cfg.rot);
        sMesh.userData = { faceDir: cfg.dir, cubieId: c.id };
        group.add(sMesh);
        stickers[cfg.dir] = sMat;
      }

      rootGroup.add(group);
      cubieMeshes.set(c.id, { group, bodyMat, stickers });
    }

    sceneObjectsRef.current = {
      scene,
      camera,
      renderer,
      rootGroup,
      pivotGroup,
      arrowGroup,
      cubieMeshes,
    };

    syncCubieMeshes(cubeRef.current, getActiveLayerFilterFromToken(hintMoveTokenRef.current));
    rebuild3DArrow(activeAnimRef.current?.moveToken ?? hintMoveTokenRef.current);

    // Pointer interaction: Raycast cubie sticker drag vs Orbit camera drag
    const { handlePointerDown, handlePointerMove, handlePointerUp } = createStagePointerHandlers({
      domElement: renderer.domElement,
      camera,
      rootGroup,
      cameraSpherical: cameraSphericalRef.current,
      isAnimating: () => Boolean(activeAnimRef.current),
      onRequestRender: () => {
        needsRenderRef.current = true;
      },
      onUserMove: (moveToken) => {
        onUserMoveRef.current(moveToken);
      },
    });

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleContextLost = (e: Event) => {
      if (contextLossCountRef.current < 2) {
        e.preventDefault();
        contextLossCountRef.current += 1;
      } else {
        useFallback();
      }
    };

    const handleContextRestored = () => {
      setSceneKey((k) => k + 1);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const sph = cameraSphericalRef.current;
      sph.radius = Math.max(5.2, Math.min(11.0, sph.radius + e.deltaY * 0.003));
      needsRenderRef.current = true;
    };

    const domElem = renderer.domElement;
    domElem.style.touchAction = 'none';
    domElem.addEventListener('webglcontextlost', handleContextLost);
    domElem.addEventListener('webglcontextrestored', handleContextRestored);
    domElem.addEventListener('contextmenu', handleContextMenu);
    domElem.addEventListener('pointerdown', handlePointerDown);
    domElem.addEventListener('pointermove', handlePointerMove);
    domElem.addEventListener('pointerup', handlePointerUp);
    domElem.addEventListener('pointercancel', handlePointerUp);
    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    domElem.addEventListener('wheel', handleWheel, { passive: false });

    const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    // Animation loop (on-demand rendering when idle to save mobile/laptop battery)
    let reqId = 0;
    const animate = (now: number) => {
      reqId = requestAnimationFrame(animate);

      if (document.hidden || container.clientWidth === 0 || container.clientHeight === 0) {
        return;
      }

      // Update camera spherical orbit with smooth damping (or instant snap under reduced motion)
      const sph = cameraSphericalRef.current;
      const dTheta = sph.targetTheta - sph.theta;
      const dPhi = sph.targetPhi - sph.phi;
      const camMoving = Math.abs(dTheta) > 0.0005 || Math.abs(dPhi) > 0.0005;
      if (camMoving) {
        if (reducedMotionQuery?.matches) {
          sph.theta = sph.targetTheta;
          sph.phi = sph.targetPhi;
        } else {
          sph.theta += dTheta * 0.14;
          sph.phi += dPhi * 0.14;
        }
        camera.position.x = sph.radius * Math.sin(sph.phi) * Math.sin(sph.theta);
        camera.position.y = sph.radius * Math.cos(sph.phi);
        camera.position.z = sph.radius * Math.sin(sph.phi) * Math.cos(sph.theta);
        camera.lookAt(0, 0, 0);
      } else if (needsRenderRef.current) {
        sph.theta = sph.targetTheta;
        sph.phi = sph.targetPhi;
        camera.position.x = sph.radius * Math.sin(sph.phi) * Math.sin(sph.theta);
        camera.position.y = sph.radius * Math.cos(sph.phi);
        camera.position.z = sph.radius * Math.sin(sph.phi) * Math.cos(sph.theta);
        camera.lookAt(0, 0, 0);
      }

      // Update active layer rotation animation if present
      const anim = activeAnimRef.current;
      const isAnimating = Boolean(anim);
      if (anim) {
        const elapsed = Math.max(0, now - anim.startTime);
        const effectiveDuration =
          reducedMotionQuery?.matches || anim.durationMs <= 0
            ? 0
            : Math.max(40, anim.durationMs);
        const rawT =
          effectiveDuration === 0 ? 1 : Math.min(1, elapsed / effectiveDuration);
        // Cubic ease out
        const easedT = 1 - Math.pow(1 - rawT, 3);
        const def = getMoveDefinition(anim.moveToken);
        const targetAngle = def.quarterTurns * (Math.PI / 2);
        pivotGroup.rotation.set(
          def.axis === 'x' ? targetAngle * easedT : 0,
          def.axis === 'y' ? targetAngle * easedT : 0,
          def.axis === 'z' ? targetAngle * easedT : 0
        );

        if (rawT >= 1) {
          const finishCb = anim.onFinish;
          const postMoveCube = applyMove(anim.fromCube, anim.moveToken);
          activeAnimRef.current = null;
          // Immediately sync cubie meshes to postMoveCube before rendering this frame
          // to prevent a 1-frame snapback flicker prior to React state commit
          syncCubieMeshes(
            postMoveCube,
            getActiveLayerFilterFromToken(hintMoveTokenRef.current),
            false
          );
          finishCb();
        }
      }

      if (needsRenderRef.current || camMoving || isAnimating) {
        needsRenderRef.current = false;
        renderer.render(scene, camera);
      }
    };
    reqId = requestAnimationFrame(animate);

    let lastW = width;
    let lastH = height;
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0 || (w === lastW && h === lastH)) return;
      lastW = w;
      lastH = h;
      camera.aspect = w / h;
      camera.zoom = Math.min(w < 640 ? 0.82 : 1, camera.aspect / 1.15);
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      needsRenderRef.current = false;
      renderer.render(scene, camera);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(reqId);
      resizeObserver.disconnect();
      domElem.removeEventListener('webglcontextlost', handleContextLost);
      domElem.removeEventListener('webglcontextrestored', handleContextRestored);
      domElem.removeEventListener('contextmenu', handleContextMenu);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      domElem.removeEventListener('pointermove', handlePointerMove);
      domElem.removeEventListener('pointerup', handlePointerUp);
      domElem.removeEventListener('pointercancel', handlePointerUp);
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      domElem.removeEventListener('wheel', handleWheel);
      clearArrowGroup(arrowGroup);
      gridHelper.geometry.dispose();
      if (Array.isArray(gridHelper.material)) {
        gridHelper.material.forEach((m) => m.dispose());
      } else {
        gridHelper.material.dispose();
      }
      bodyGeo.dispose();
      stickerGeo.dispose();
      cubieMeshes.forEach((rec) => {
        rec.bodyMat.dispose();
        Object.values(rec.stickers).forEach((m) => m.dispose());
      });
      renderer.forceContextLoss?.();
      renderer.dispose();
      domElem.remove();
      sceneObjectsRef.current = null;
    };
  }, [webGLUnavailable, onWebGLUnavailable, sceneKey]);

  // Trigger layer animation when activeAnimation prop changes
  useEffect(() => {
    if (activeAnimation) {
      const isReducedMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (isReducedMotion || activeAnimation.durationMs <= 0) {
        activeAnimRef.current = null;
        const postMoveCube = applyMove(activeAnimation.fromCube, activeAnimation.moveToken);
        syncCubieMeshes(
          postMoveCube,
          getActiveLayerFilterFromToken(hintMoveTokenRef.current),
          false
        );
        if (sceneObjectsRef.current) {
          const { renderer, scene, camera } = sceneObjectsRef.current;
          needsRenderRef.current = false;
          renderer.render(scene, camera);
        }
        const immediateTimer = window.setTimeout(() => {
          activeAnimation.onFinish();
        }, 0);
        return () => window.clearTimeout(immediateTimer);
      }

      const startTime = performance.now();
      let def: ReturnType<typeof getMoveDefinition> | null = null;
      try {
        def = getMoveDefinition(activeAnimation.moveToken);
      } catch {
        def = null;
      }
      if (def) {
        syncCubieMeshes(
          activeAnimation.fromCube,
          { axis: def.axis, layers: def.layers },
          true
        );
      }
      activeAnimRef.current = {
        ...activeAnimation,
        startTime,
        started: Boolean(def),
      };

      // Safety fallback timer so animations still complete on schedule when rAF is throttled
      const fallbackTimer = window.setTimeout(() => {
        const anim = activeAnimRef.current;
        if (!anim || anim.id !== activeAnimation.id) return;
        const finishCb = anim.onFinish;
        const postMoveCube = applyMove(anim.fromCube, anim.moveToken);
        activeAnimRef.current = null;
        syncCubieMeshes(
          postMoveCube,
          getActiveLayerFilterFromToken(hintMoveTokenRef.current),
          false
        );
        if (sceneObjectsRef.current) {
          const { renderer, scene, camera } = sceneObjectsRef.current;
          renderer.render(scene, camera);
        }
        finishCb();
      }, Math.max(40, activeAnimation.durationMs) + 25);

      return () => window.clearTimeout(fallbackTimer);
    } else {
      activeAnimRef.current = null;
      syncCubieMeshes(cube, getActiveLayerFilterFromToken(hintMoveToken));
    }
  }, [activeAnimation]);

  // Sync static cube state & focus mode when not animating
  useEffect(() => {
    if (!activeAnimRef.current) {
      syncCubieMeshes(cube, getActiveLayerFilterFromToken(hintMoveToken));
    }
  }, [cube, focusMode, isCubieFocused, hintMoveToken, sceneKey]);

  // Rebuild 3D directional arrow when hintMoveToken, show3DArrows, or sceneKey changes
  useEffect(() => {
    const tokenForArrow = activeAnimation?.moveToken ?? hintMoveToken;
    rebuild3DArrow(tokenForArrow);
  }, [hintMoveToken, activeAnimation, show3DArrows, sceneKey]);

  const applyCameraPreset = (idx: number) => {
    const preset = CAMERA_PRESETS[idx];
    if (!preset) return;
    setActivePresetIdx(idx);
    cameraSphericalRef.current.targetTheta = preset.theta;
    cameraSphericalRef.current.targetPhi = preset.phi;
    needsRenderRef.current = true;
  };

  const effectiveHintToken = activeAnimation?.moveToken ?? hintMoveToken;
  const hintDef = effectiveHintToken
    ? (() => {
        try {
          return getMoveDefinition(effectiveHintToken);
        } catch {
          return null;
        }
      })()
    : null;

  if (webGLUnavailable) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 p-2 text-center">
        <p className="text-xs text-slate-300" role="status">3D 暂不可用，已切换为可操作的 2D 展开图。</p>
        {fallback}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col select-none overflow-hidden bg-radial from-[#131d31] via-[#0b111e] to-[#070a12]">
      {/* Top Overlay: Mode Status, Camera View Presets & Active Move HUD */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 pointer-events-auto">
            {modeBadgeText && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/85 border border-cyan-500/30 backdrop-blur-md shadow-lg">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-semibold text-cyan-200 tracking-wide">
                  {modeBadgeText}
                </span>
              </div>
            )}
          </div>

          {/* Camera Angle Presets */}
          <div className="flex items-center gap-0.5 max-w-full overflow-x-auto bg-slate-900/85 border border-slate-700/70 rounded-lg p-1 backdrop-blur-md pointer-events-auto">
            <Compass className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
            {CAMERA_PRESETS.map((preset, idx) => (
              <button
                key={preset.label}
                onClick={() => applyCameraPreset(idx)}
                className={`px-1 sm:px-2 py-1 rounded text-[11px] whitespace-nowrap font-medium transition-colors cursor-pointer ${
                  activePresetIdx === idx
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
                title={preset.label}
              >
                {preset.label.split(' ')[0]}
              </button>
            ))}
            <button
              onClick={() => applyCameraPreset(0)}
              className="p-1 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
              title="重置标准视角"
              aria-label="重置标准视角"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Floating 3D Move Action HUD Banner */}
        <div className="flex items-center justify-between gap-2">
          {hintDef ? (
            <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-cyan-400/45 shadow-[0_0_25px_rgba(34,211,238,0.18)] backdrop-blur-md">
              <div className="flex items-center justify-center min-w-[40px] h-9 px-2 rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-400/50 font-mono text-base font-bold text-cyan-200">
                {hintDef.token}
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-100">{hintDef.nameZh}</div>
                <div className="text-[11px] text-cyan-300/90">{hintDef.fingerTrickZh}</div>
              </div>
            </div>
          ) : (
            <div />
          )}

          {focusMode && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>聚焦模式：仅高亮本课关键块</span>
            </div>
          )}
        </div>
      </div>

      {/* Three.js Canvas Mount */}
      <div
        ref={mountRef}
        className="w-full h-full flex-1 cursor-grab active:cursor-grabbing touch-none"
        data-testid="cube-3d-canvas"
      />

      {/* Bottom-Left Orientation & Interaction Legend */}
      <div className="absolute bottom-3 left-3 z-10 hidden md:flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 backdrop-blur-sm">
          <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-slate-100">直接拖拽魔方色块</strong>即可拨动对应层 ·{' '}
            <strong className="text-slate-100">拖拽空白处</strong>自由旋转 3D 视角
          </span>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/75 border border-slate-800/80 text-[11px] text-slate-400">
          <span>标准配色基准：</span>
          <span className="inline-flex items-center gap-1 text-yellow-300 font-medium">
            <i className="w-2 h-2 rounded-xs bg-[#FACC15]" /> 上黄(U)
          </span>
          <span className="inline-flex items-center gap-1 text-slate-100 font-medium">
            <i className="w-2 h-2 rounded-xs bg-[#F8FAFC]" /> 下白(D)
          </span>
          <span className="inline-flex items-center gap-1 text-blue-400 font-medium">
            <i className="w-2 h-2 rounded-xs bg-[#2563EB]" /> 前蓝(F)
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
            <i className="w-2 h-2 rounded-xs bg-[#10B981]" /> 后绿(B)
          </span>
          <span className="inline-flex items-center gap-1 text-orange-400 font-medium">
            <i className="w-2 h-2 rounded-xs bg-[#F97316]" /> 左橙(L)
          </span>
          <span className="inline-flex items-center gap-1 text-red-400 font-medium">
            <i className="w-2 h-2 rounded-xs bg-[#EF4444]" /> 右红(R)
          </span>
        </div>
      </div>
    </div>
  );
});
