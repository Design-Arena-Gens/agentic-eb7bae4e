"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function lerpColor(a, b, t) {
  const c1 = new THREE.Color(a);
  const c2 = new THREE.Color(b);
  return c1.lerp(c2, t).clone();
}

function colorForCharge(charge) {
  const t = clamp01(charge);
  if (t < 0.5) {
    const k = t / 0.5; // 0..1 from red to yellow
    return lerpColor("#e11d48", "#f59e0b", k);
  }
  const k = (t - 0.5) / 0.5; // 0..1 from yellow to green
  return lerpColor("#f59e0b", "#10b981", k);
}

export default function Battery3D({ charge = 0.5 }) {
  const containerRef = useRef(null);
  const threeRef = useRef({});
  const dims = useMemo(() => ({
    innerX: 3.2,
    innerY: 1.5,
    innerZ: 1.2,
    shellThickness: 0.1,
    capLength: 0.35
  }), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0b1020");

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(4.2, 2.4, 4.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.target.set(0, 0, 0);
    controls.update();

    // Lights
    const hemi = new THREE.HemisphereLight("#cbd5e1", "#0b1020", 0.6);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight("#ffffff", 1.1);
    dir.position.set(3, 4, 3);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    scene.add(dir);

    const point = new THREE.PointLight("#7dd3fc", 0.5);
    point.position.set(-3, 2, -2);
    scene.add(point);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ opacity: 0.22 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Battery group
    const group = new THREE.Group();
    scene.add(group);

    // Shell
    const shellGeom = new RoundedBoxGeometry(
      dims.innerX + dims.shellThickness * 2,
      dims.innerY + dims.shellThickness * 2,
      dims.innerZ + dims.shellThickness * 2,
      6,
      0.2
    );
    const shell = new THREE.Mesh(
      shellGeom,
      new THREE.MeshStandardMaterial({ color: "#111827", metalness: 0.4, roughness: 0.5 })
    );
    shell.castShadow = true;
    shell.receiveShadow = true;
    group.add(shell);

    // Cap
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(dims.capLength, dims.innerY * 0.65, dims.innerZ * 0.5),
      new THREE.MeshStandardMaterial({ color: "#1f2937", metalness: 0.6, roughness: 0.35 })
    );
    cap.position.set(dims.innerX / 2 + dims.capLength / 2, 0, 0);
    cap.castShadow = true;
    cap.receiveShadow = true;
    group.add(cap);

    // Inner glass cavity
    const glass = new THREE.Mesh(
      new RoundedBoxGeometry(dims.innerX, dims.innerY, dims.innerZ, 4, 0.16),
      new THREE.MeshPhysicalMaterial({
        color: "#0b1222",
        transparent: true,
        opacity: 0.25,
        roughness: 0.2,
        metalness: 0.0,
        transmission: 0.6,
        thickness: 0.5,
        ior: 1.2
      })
    );
    glass.castShadow = false;
    glass.receiveShadow = false;
    group.add(glass);

    // Charge level
    const levelMaterial = new THREE.MeshStandardMaterial({ color: "#10b981", emissive: "#10b981", emissiveIntensity: 0.6, roughness: 0.35, metalness: 0.1 });
    const level = new THREE.Mesh(
      new THREE.BoxGeometry(dims.innerX, dims.innerY * 0.72, dims.innerZ * 0.8),
      levelMaterial
    );
    level.castShadow = false;
    level.receiveShadow = false;
    group.add(level);

    // Markers/ticks
    const ticks = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const x = -dims.innerX / 2 + (i * dims.innerX) / 4;
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.12, 0.02),
        new THREE.MeshStandardMaterial({ color: "#334155" })
      );
      tick.position.set(x, -dims.innerY * 0.45, dims.innerZ / 2 + 0.02);
      ticks.add(tick);
    }
    group.add(ticks);

    // Persist refs
    threeRef.current = { scene, camera, renderer, controls, level, levelMaterial };

    // Initial sizing
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // Animate
    let rafId = 0;
    const renderLoop = () => {
      controls.update();
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(renderLoop);
    };
    rafId = requestAnimationFrame(renderLoop);

    // Cleanup
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      // Dispose geometries/materials
      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry?.dispose?.();
          obj.material?.dispose?.();
        }
      });
    };
  }, [dims]);

  // Update charge visuals whenever prop changes
  useEffect(() => {
    const { level, levelMaterial } = threeRef.current;
    if (!level || !levelMaterial) return;

    const t = clamp01(charge);
    level.scale.x = 0.02 + t * 0.98;
    level.position.x = -dims.innerX / 2 + (dims.innerX * level.scale.x) / 2;

    const c = colorForCharge(t);
    levelMaterial.color.copy(c);
    levelMaterial.emissive.copy(c);
  }, [charge, dims]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "520px", borderRadius: 12, overflow: "hidden" }} />
  );
}
