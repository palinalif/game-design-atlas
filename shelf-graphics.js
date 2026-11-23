import * as THREE from 'three';

export function surface(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .83, ...options });
}

export function kit() {
  const resources = new Set();
  const boxes = new Map();
  const keep = resource => (resources.add(resource), resource);
  const planeGeometry = keep(new THREE.PlaneGeometry());
  function mesh(parent, geometry, material, x, y, z) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }
  function box(parent, w, h, d, x, y, z, material) {
    const key = [w, h, d].join(',');
    if (!boxes.has(key)) boxes.set(key, keep(new THREE.BoxGeometry(w, h, d)));
    return mesh(parent, boxes.get(key), material, x, y, z);
  }
  function plane(parent, w, h, x, y, z, material) {
    const object = mesh(parent, planeGeometry, material, x, y, z);
    object.scale.set(w, h, 1);
    return object;
  }
  return { keep, mesh, box, plane, dispose: () => resources.forEach(r => r.dispose()) };
}

export function canvasTexture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 3;
  return texture;
}

export function randomGenerator(seed) {
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
