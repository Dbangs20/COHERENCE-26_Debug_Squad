import { useEffect, useRef } from "react";

const DnaHelixBackground = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return undefined;
    let frameId = null;
    let teardown = null;
    let isCancelled = false;

    const ensureThreeLoaded = () =>
      new Promise((resolve, reject) => {
        if (window.THREE) {
          resolve(window.THREE);
          return;
        }
        const existing = document.querySelector('script[data-three-cdn="true"]');
        if (existing) {
          existing.addEventListener("load", () => resolve(window.THREE), { once: true });
          existing.addEventListener("error", () => reject(new Error("Failed to load Three.js")), { once: true });
          return;
        }
        const script = document.createElement("script");
        script.src = "https://unpkg.com/three@0.170.0/build/three.min.js";
        script.async = true;
        script.dataset.threeCdn = "true";
        script.onload = () => resolve(window.THREE);
        script.onerror = () => reject(new Error("Failed to load Three.js"));
        document.head.appendChild(script);
      });

    const init = async () => {
      const THREE = await ensureThreeLoaded();
      if (!THREE || isCancelled || !mountRef.current) return;

      const container = mountRef.current;
      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 1000);
      camera.position.set(0, 0, 30);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.72);
      scene.add(ambientLight);

      const pointLight = new THREE.PointLight(0x00d1ff, 2.6, 140);
      pointLight.position.set(10, 8, 16);
      scene.add(pointLight);

      const backLight = new THREE.PointLight(0x8a2be2, 1.45, 110);
      backLight.position.set(-10, -6, -12);
      scene.add(backLight);

      const dnaRoot = new THREE.Group();
      scene.add(dnaRoot);

      const sphereGeometry = new THREE.SphereGeometry(0.26, 16, 16);
      const strandOneMaterial = new THREE.MeshStandardMaterial({
        color: 0x00d1ff,
        emissive: 0x005a80,
        emissiveIntensity: 0.72,
        roughness: 0.42,
        metalness: 0.08,
      });
      const strandTwoMaterial = new THREE.MeshStandardMaterial({
        color: 0x8a2be2,
        emissive: 0x3b116b,
        emissiveIntensity: 0.66,
        roughness: 0.42,
        metalness: 0.08,
      });
      const bridgeMaterial = new THREE.MeshStandardMaterial({
        color: 0x8bb9c7,
        emissive: 0x2b3f48,
        emissiveIntensity: 0.44,
        roughness: 0.5,
        metalness: 0.1,
      });

      const rungCount = 56;
      const radius = 2.55;
      const stepY = 0.33;
      const stepTheta = 0.48;
      const bridgeRadius = 0.06;

      const makeHelix = (x, scale = 1, rot = 0) => {
        const helixGroup = new THREE.Group();
        helixGroup.position.x = x;
        helixGroup.rotation.z = rot;
        helixGroup.scale.setScalar(scale);
        for (let i = 0; i < rungCount; i += 1) {
          const theta = i * stepTheta;
          const y = (i - rungCount / 2) * stepY;
          const p1 = new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius);
          const p2 = new THREE.Vector3(Math.cos(theta + Math.PI) * radius, y, Math.sin(theta + Math.PI) * radius);

          const n1 = new THREE.Mesh(sphereGeometry, strandOneMaterial);
          n1.position.copy(p1);
          helixGroup.add(n1);

          const n2 = new THREE.Mesh(sphereGeometry, strandTwoMaterial);
          n2.position.copy(p2);
          helixGroup.add(n2);

          if (i % 2 === 0) {
            const bridgeLength = p1.distanceTo(p2);
            const bridgeGeometry = new THREE.CylinderGeometry(bridgeRadius, bridgeRadius, bridgeLength, 8);
            const bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
            bridge.position.copy(p1).lerp(p2, 0.5);
            const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
            const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
            bridge.quaternion.copy(quaternion);
            helixGroup.add(bridge);
          }
        }
        dnaRoot.add(helixGroup);
        return helixGroup;
      };

      const centerHelix = makeHelix(0, 1.15, 0.08);
      const leftHelix = makeHelix(-10.8, 0.86, -0.03);
      const rightHelix = makeHelix(10.8, 0.86, 0.03);

      const particleCount = 120;
      const particleGeometry = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);
      const particleColors = new Float32Array(particleCount * 3);
      const particleBase = new Float32Array(particleCount * 3);
      const particleDrift = new Float32Array(particleCount * 2);
      const palette = [new THREE.Color("#00D1FF"), new THREE.Color("#8A2BE2"), new THREE.Color("#00FFB2")];

      for (let i = 0; i < particleCount; i += 1) {
        const idx = i * 3;
        const x = (Math.random() - 0.5) * 28;
        const y = (Math.random() - 0.5) * 16;
        const z = (Math.random() - 0.5) * 18;
        particlePositions[idx] = x;
        particlePositions[idx + 1] = y;
        particlePositions[idx + 2] = z;
        particleBase[idx] = x;
        particleBase[idx + 1] = y;
        particleBase[idx + 2] = z;
        const c = palette[Math.floor(Math.random() * palette.length)];
        particleColors[idx] = c.r;
        particleColors[idx + 1] = c.g;
        particleColors[idx + 2] = c.b;
        particleDrift[i * 2] = 0.16 + Math.random() * 0.42;
        particleDrift[i * 2 + 1] = Math.random() * Math.PI * 2;
      }

      particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
      particleGeometry.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));
      const particleMaterial = new THREE.PointsMaterial({
        size: 0.16,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);

      const onResize = () => {
        if (!container) return;
        camera.aspect = container.clientWidth / Math.max(container.clientHeight, 1);
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      };
      onResize();
      window.addEventListener("resize", onResize);

      const animate = (time) => {
        const t = time * 0.001;
        centerHelix.rotation.y += 0.002;
        centerHelix.rotation.x = Math.sin(t * 0.4) * 0.06;
        leftHelix.rotation.y -= 0.0016;
        rightHelix.rotation.y += 0.0016;

        const posArray = particleGeometry.attributes.position.array;
        for (let i = 0; i < particleCount; i += 1) {
          const idx = i * 3;
          const speed = particleDrift[i * 2];
          const phase = particleDrift[i * 2 + 1];
          posArray[idx] = particleBase[idx] + Math.sin(t * speed + phase) * 0.24;
          posArray[idx + 1] = particleBase[idx + 1] + Math.cos(t * speed * 0.9 + phase) * 0.2;
          posArray[idx + 2] = particleBase[idx + 2] + Math.sin(t * speed * 1.1 + phase * 0.5) * 0.16;
        }
        particleGeometry.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(animate);
      };
      frameId = window.requestAnimationFrame(animate);

      teardown = () => {
        if (frameId) window.cancelAnimationFrame(frameId);
        window.removeEventListener("resize", onResize);
        scene.traverse((obj) => {
          if (obj.isMesh) {
            obj.geometry?.dispose?.();
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose?.());
            } else {
              obj.material?.dispose?.();
            }
          }
        });
        particleGeometry.dispose();
        particleMaterial.dispose();
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    };

    init().catch(() => {});

    return () => {
      isCancelled = true;
      if (teardown) teardown();
    };
  }, []);

  return <div ref={mountRef} className="dna-canvas-wrap absolute inset-0 pointer-events-none" aria-hidden="true" />;
};

export default DnaHelixBackground;
