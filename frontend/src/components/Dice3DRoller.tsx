import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type Props = {
  width?: number;
  height?: number;
  durationMs?: number;
};

export default function Dice3DRoller({ width = 180, height = 120, durationMs = 2000 }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.6, 4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const light1 = new THREE.DirectionalLight(0xffffff, 0.9);
    light1.position.set(3, 5, 4);
    scene.add(light1);
    const light2 = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(light2);

    const matOrange = new THREE.MeshStandardMaterial({ color: new THREE.Color('#e67e22'), metalness: 0.2, roughness: 0.6 });
    const matGreen = new THREE.MeshStandardMaterial({ color: new THREE.Color('#2ecc71'), metalness: 0.2, roughness: 0.6 });

    const die1 = new THREE.Group();
    const die2 = new THREE.Group();
    die1.position.set(-0.9, 0, 0);
    die2.position.set(0.9, 0, 0);
    scene.add(die1);
    scene.add(die2);

    function applyMaterialToGroup(g: THREE.Group, mat: THREE.Material) {
      g.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.material = mat;
          if (mesh.geometry) mesh.geometry.computeVertexNormals();
        }
      });
    }

    async function loadD10(into: THREE.Group, material: THREE.Material) {
      try {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync('/models/d10.glb');
        const model = gltf.scene.clone(true);
        // Center and scale
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const target = 1.0; // approx overall size
        const scale = target / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(scale);
        applyMaterialToGroup(model as THREE.Group, material);
        into.add(model);
      } catch (e) {
        // Fallback primitive
        const geo = new THREE.DodecahedronGeometry(0.5, 0);
        const fallback = new THREE.Mesh(geo, material);
        into.add(fallback);
      }
    }

    // Kick off loads in parallel
    void loadD10(die1, matOrange);
    void loadD10(die2, matGreen);

    const start = performance.now();

    function animate(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      // Spin up quickly then ease out
      const speed = (1 - Math.pow(1 - t, 3)) * 6 + 0.5; // 0.5..6.5
      die1.rotation.x += 0.08 * speed;
      die1.rotation.y += 0.05 * speed;
      die2.rotation.x += 0.07 * speed;
      die2.rotation.y += 0.06 * speed;

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);

      if (t >= 1) {
        // After duration, stop updating but keep last frame rendered
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      }
    }

    rafRef.current = requestAnimationFrame(animate);

    function handleResize() {
      const w = width;
      const h = height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if ((mesh as any).isMesh) {
          if (mesh.geometry) mesh.geometry.dispose();
          const mat: any = mesh.material;
          if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
          else if (mat && typeof mat.dispose === 'function') mat.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [width, height, durationMs]);

  return (
    <div ref={mountRef} style={{ width, height, display: 'inline-block' }} />
  );
}
