// STL 3D viewer: three.js is heavy (core ~150KB gzip), so it is loaded
// dynamically only when scrolling nears a model (module-level cache), with
// drag rotation / wheel zoom and a slow auto-rotation. Prose scans
// .stl-placeholder (data-stl holds the ASCII source) and renders each mount
// point, following the same pattern as MermaidRenderer.
// The render loop follows the viewport: frames pause when the model scrolls
// out of view (setAnimationLoop(null)) and resume when it returns — with
// autoRotate, not pausing keeps CPU/GPU pegged continuously.

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n.ts";
import { useInView } from "@/lib/useInView.ts";

interface StlViewerProps {
  stl: string;
}

type ThreeBundle = [
  typeof import("three"),
  typeof import("three/examples/jsm/controls/OrbitControls.js"),
  typeof import("three/examples/jsm/loaders/STLLoader.js"),
];

let threePromise: Promise<ThreeBundle> | null = null;

/** Lazy-load the full three bundle (module-level cache; loaded once
 *  site-wide). */
function loadThree() {
  threePromise ??= Promise.all([
    import("three"),
    import("three/examples/jsm/controls/OrbitControls.js"),
    import("three/examples/jsm/loaders/STLLoader.js"),
  ]);
  return threePromise;
}

export function StlViewer({ stl }: StlViewerProps) {
  const t = useT();
  // Load only on entering the viewport (with a 300px buffer)
  const { ref: containerRef, inView: visible } = useInView<HTMLDivElement>({ once: true });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const el = containerRef.current;
    if (!el) {
      return;
    }
    let disposed = false;
    let teardown = () => {};

    void (async () => {
      try {
        const [THREE, { OrbitControls }, { STLLoader }] = await loadThree();
        if (disposed || !el.isConnected) {
          return;
        }

        const geometry = new STLLoader().parse(stl);
        geometry.center();
        geometry.computeBoundingSphere();
        const radius = geometry.boundingSphere?.radius ?? 1;

        const width = el.clientWidth || 640;
        const height = Math.max(280, Math.round(width * 0.56));
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height);

        const camera = new THREE.PerspectiveCamera(45, width / height, radius / 100, radius * 20);
        camera.position.set(radius * 1.8, radius * 1.4, radius * 2.2);
        camera.lookAt(0, 0, 0);

        const scene = new THREE.Scene();
        const material = new THREE.MeshStandardMaterial({
          color: 0xd9b45b,
          metalness: 0.15,
          roughness: 0.55,
        });
        scene.add(new THREE.Mesh(geometry, material));
        scene.add(new THREE.HemisphereLight(0xffffff, 0x6b6b6b, 2.4));
        const key = new THREE.DirectionalLight(0xffffff, 2.2);
        key.position.set(radius * 2, radius * 3, radius * 2);
        scene.add(key);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.6;
        controls.enableDamping = true;

        // The render loop follows the viewport: drag/zoom is driven by
        // OrbitControls events, independent of the loop; pausing frames only
        // stops autoRotate's continuous redraw
        const syncLoop = (inView: boolean) => {
          if (inView) {
            renderer.setAnimationLoop(() => {
              controls.update();
              renderer.render(scene, camera);
            });
          } else {
            renderer.setAnimationLoop(null);
          }
        };
        const observer = new IntersectionObserver(
          (entries) => {
            syncLoop(entries.some((entry) => entry.isIntersecting));
          },
          { rootMargin: "120px" },
        );
        observer.observe(el);
        syncLoop(true);

        el.appendChild(renderer.domElement);

        teardown = () => {
          observer.disconnect();
          renderer.setAnimationLoop(null);
          controls.dispose();
          geometry.dispose();
          material.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch {
        if (!disposed) {
          setFailed(true);
        }
      }
    })();

    return () => {
      disposed = true;
      teardown();
    };
  }, [visible, stl, containerRef.current]);

  if (failed) {
    return (
      <div className="rounded-lg border border-danger/60 bg-danger/10 p-4 text-sm" role="alert">
        <p className="font-semibold text-ink">{t("stl.failed")}</p>
        <p className="mt-1 text-xs text-ink-2">{t("stl.failedHint")}</p>
      </div>
    );
  }

  return <div className="stl-stage" ref={containerRef} />;
}
