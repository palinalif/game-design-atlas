import * as THREE from 'three';
import { kit } from './shelf-graphics.js';
import { WINDOW_CENTER } from './shelf-window.js';

// Capture a low-resolution radiance map once. The panels approximate large
// sources and nearby reflected light at the cabinet's position.
export function buildRoomEnvironment(renderer) {
  const probe = new THREE.Scene();
  probe.background = new THREE.Color('#211e1b');
  const center = new THREE.Vector3(.03, .70, .44);
  const k = kit();
  function panel(width, height, x, y, z, color, radiance) {
    const material = k.keep(new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(radiance),
      toneMapped: false,
    }));
    k.plane(probe, width, height, x, y, z, material).lookAt(center);
  }

  panel(.63, .17, WINDOW_CENTER.x, WINDOW_CENTER.y, WINDOW_CENTER.z, '#deedfa', 3.7);
  panel(.80, .93, -.84, 1.14, 1.09, '#c2d6df', .78);
  panel(.52, .41, -.38, .47, 1.48, '#a4bbc0', .42);
  panel(.23, .16, .70, .64, .23, '#ffd098', 2.9);
  panel(1.68, 1.01, .23, -.04, .71, '#b37d5b', .31);
  panel(1.84, 1.04, .01, 1.46, .43, '#b8aa94', .26);
  panel(1.28, 1.13, -1.06, .68, .62, '#768375', .30);

  const generator = new THREE.PMREMGenerator(renderer);
  try {
    return generator.fromScene(probe, .045, .03, 6, { size: 64, position: center });
  } finally {
    generator.dispose();
    k.dispose();
  }
}
