// STL 3D 查看器：three.js 体量大（core 约 150KB gzip），滚动到模型附近才
// 动态加载（模块级缓存），拖拽旋转 / 滚轮缩放，慢速自转。挂载点由 Prose
// 扫描 .stl-placeholder（data-stl 存 ASCII 源文）逐个渲染，模式与
// MermaidRenderer 一致。
// 渲染循环跟随视口：模型滚出视口即停帧（setAnimationLoop(null)），回到视口
// 恢复 —— autoRotate 场景下不停帧会持续吃满 CPU/GPU。

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n.ts";

interface StlViewerProps {
  stl: string;
}

type ThreeBundle = [
  typeof import("three"),
  typeof import("three/examples/jsm/controls/OrbitControls.js"),
  typeof import("three/examples/jsm/loaders/STLLoader.js"),
];

let threePromise: Promise<ThreeBundle> | null = null;

/** 懒加载 three 全家桶（模块级缓存，全站只加载一次）。 */
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
  const containerRef = useRef<HTMLDivElement>(null);
  // 旧浏览器无 IntersectionObserver 时直接以可见起始，避免在 effect 里同步 setState
  const [visible, setVisible] = useState(() => typeof window !== "undefined" && !("IntersectionObserver" in window));
  const [failed, setFailed] = useState(false);

  // 进入视口（含 300px 缓冲）才触发加载
  useEffect(() => {
    const el = containerRef.current;
    if (!el || visible) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

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
        if (disposed || !containerRef.current) {
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

        // 渲染循环跟随视口：拖拽/缩放由 OrbitControls 事件驱动，与循环独立；
        // 停帧只是暂停 autoRotate 的持续重绘
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
  }, [visible, stl]);

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
