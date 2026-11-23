import * as THREE from 'three';
import { buildRoom } from './shelf-room.js';
import { buildCases, updateCover } from './shelf-cases.js';
import { WINDOW_CENTER } from './shelf-window.js';

const { ROWS_PER_SHELF } = globalThis.PlayableShelfCatalog;

const stage = document.getElementById('threeShelf');
const viewport = document.getElementById('threeViewport');
const tooltip = document.getElementById('threeTooltip');
const toggle = document.getElementById('threeShelfToggle');
const picker = document.getElementById('threeCasePicker');
const pickButton = document.getElementById('threePickButton');
const catalog = document.getElementById('catalog');
const shelfScene = document.getElementById('shelfScene');
const details = document.getElementById('details');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function startShelf() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  const canvas = renderer.domElement;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  canvas.setAttribute('aria-hidden', 'true');
  viewport.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#27382e');
  scene.add(new THREE.HemisphereLight(0xe4e9e7, 0xa48a74, 1.06));
  const daylight = new THREE.SpotLight(0xe9f2ff, 7.4, 3.9, .59, .75, 2);
  daylight.position.copy(WINDOW_CENTER).add(new THREE.Vector3(0, .029, .049));
  daylight.target.position.set(-.54, .34, .97);
  daylight.castShadow = true;
  daylight.shadow.mapSize.set(1024, 1024);
  daylight.shadow.camera.near = .04;
  daylight.shadow.camera.far = 3.9;
  daylight.shadow.normalBias = .0028;
  daylight.shadow.radius = 4;
  daylight.shadow.intensity = .76;
  scene.add(daylight, daylight.target);

  // Broad reflected light reaches the front of the cabinet from the room.
  const bounce = new THREE.SpotLight(0xe9edf3, 3.05, 3.7, 1.04, .93, 2);
  bounce.position.set(-.83, 1.18, 1.19);
  bounce.target.position.set(.09, .53, .26);
  scene.add(bounce, bounce.target);

  const camera = new THREE.PerspectiveCamera(34, 1, .08, 12);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const position = new THREE.Vector3();
  const highlight = new THREE.Mesh(
    new THREE.PlaneGeometry(1, .004),
    new THREE.MeshBasicMaterial({ color: '#ffdb91', depthTest: false }),
  );
  highlight.renderOrder = 5;
  scene.add(highlight);
  highlight.visible = false;

  let room;
  let cases;
  let initialState;
  let signature;
  let currentPage = 0;
  let targetId;
  let selected;
  let pointerStart;
  let raf = 0;
  let distance = 2.8;
  let pan = 0;
  let enabled = true;
  let broken = false;
  let previousFrame = 0;

  function requestDraw() {
    if (!raf && enabled && !broken && !document.hidden && !shelfScene.hidden && !stage.hidden) {
      raf = requestAnimationFrame(draw);
    }
  }

  function openDetails(id) {
    window.dispatchEvent(new CustomEvent('playable:open-game', { detail: { id } }));
  }

  function takeCase(id) {
    if (!cases?.entries.has(id) || details.open) return;
    selected = { id, start: performance.now(), pending: true };
    tooltip.hidden = true;
    picker.value = id;
    pickButton.disabled = false;
    if (reducedMotion.matches) {
      selected.pending = false;
      openDetails(id);
    }
    requestDraw();
  }

  function draw(now) {
    raf = 0;
    if (shelfScene.hidden || document.hidden || stage.hidden) return;
    const elapsed = previousFrame ? now - previousFrame : 16;
    previousFrame = now;
    const blend = reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 52);
    pan *= 1 - blend;
    const wide = THREE.MathUtils.smoothstep(camera.aspect, .80, 1.75);
    camera.position.set(.231 + wide * .41 + pan, .83 + wide * .08, distance);
    camera.lookAt(.012 - wide * .18 + pan * .29, .713, .105);

    let animating = Math.abs(pan) > .001;
    for (const [id, item] of cases.entries) {
      const picked = selected?.id === id;
      const z = picked ? .49 : item.base.z;
      const y = item.base.y + (picked ? .055 : 0);
      const yaw = picked ? .04 : item.yaw;
      const { pivot } = item;
      position.set(item.base.x, y, z);
      pivot.position.lerp(position, blend);
      pivot.rotation.y = THREE.MathUtils.lerp(pivot.rotation.y, yaw, blend);
      pivot.rotation.z = THREE.MathUtils.lerp(pivot.rotation.z, picked ? -.037 : item.lean, blend);
      animating ||= pivot.position.distanceToSquared(position) > .000001 || Math.abs(pivot.rotation.y - yaw) > .008;
    }
    const marked = cases.entries.get(picker.value || targetId);
    highlight.visible = Boolean(marked && !selected);
    if (marked) {
      highlight.position.set(marked.base.x, marked.deck - .007, .339);
      highlight.scale.x = Math.max(.021, marked.span * .86);
    }

    try {
      renderer.render(scene, camera);
    } catch (error) {
      fail(error);
      return;
    }
    if (selected?.pending) {
      if (performance.now() - selected.start >= 225 || reducedMotion.matches) {
        selected.pending = false;
        openDetails(selected.id);
      } else {
        animating = true;
      }
    }
    if (animating) requestDraw();
    else previousFrame = 0;
  }

  function resize() {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (!width || !height || broken) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const halfAngle = THREE.MathUtils.degToRad(camera.fov / 2);
    distance = .105 + Math.max(1.60, .92 / camera.aspect) / (2 * Math.tan(halfAngle));
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, width < 550 ? 1.35 : 1.6));
    renderer.setSize(width, height, false);
    requestDraw();
  }

  function refreshVisibility() {
    const populated = Boolean(cases?.entries.size);
    catalog.classList.toggle('three-ready', enabled && populated && !broken);
    stage.hidden = !enabled || !populated || broken;
    picker.closest('form').hidden = stage.hidden;
    toggle.hidden = !populated || broken;
    toggle.textContent = enabled ? 'Use 2D shelves' : 'Use 3D shelf';
    toggle.setAttribute('aria-pressed', String(enabled));
    if (stage.hidden) tooltip.hidden = true;
  }

  function disposeCases() {
    if (!cases) return;
    for (const item of cases.entries.values()) item.cancelCover?.();
    cases.dispose();
  }

  function update(payload) {
    if (broken) return;
    try {
      initialState = payload;
      const page = payload.page || 0;
      const rows = payload.rows.slice(page * ROWS_PER_SHELF, (page + 1) * ROWS_PER_SHELF);
      const key = JSON.stringify([page, rows.map(row => row.games.map(game => game.id))]);
      const rebuilt = key !== signature;
      if (rebuilt) {
        if (signature && page !== currentPage) pan = Math.sign(page - currentPage) * .12;
        signature = key;
        currentPage = page;
        selected = null;
        disposeCases();
        cases = buildCases(scene, rows, room.shadowTex, page === 0);
        renderer.shadowMap.needsUpdate = true;
        picker.replaceChildren(new Option('Find a case on this shelf', ''));
        for (const { game } of cases.entries.values()) picker.add(new Option(game.title, game.id));
      }
      const target = payload.target?.game?.id;
      if (target !== targetId || rebuilt) {
        if (cases.entries.has(target)) picker.value = target;
        else if (picker.value === targetId) picker.value = '';
      }
      targetId = target;
      pickButton.disabled = !picker.value;
      if (enabled) {
        const covers = new Map(payload.covers);
        for (const [id, item] of cases.entries) updateCover(item, covers.get(id) || [], requestDraw);
      }
      refreshVisibility();
      resize();
    } catch (error) {
      fail(error);
    }
  }

  function pick(event) {
    if (stage.hidden) return null;
    const bounds = canvas.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(cases.bodies, false)[0]?.object.userData.id;
  }

  const events = new AbortController();
  const listen = (node, name, listener) => node.addEventListener(name, listener, { signal: events.signal });
  const observer = new ResizeObserver(resize);
  function dispose() {
    cancelAnimationFrame(raf);
    events.abort();
    observer.disconnect();
    disposeCases();
    room?.dispose();
    highlight.geometry.dispose();
    highlight.material.dispose();
    renderer.dispose();
    canvas.remove();
  }
  function fail(error) {
    if (broken) return;
    broken = true;
    console.info('PLAYABLE is using 2D shelves.', error);
    refreshVisibility();
    dispose();
  }

  listen(canvas, 'pointermove', event => {
    if (event.pointerType === 'touch') return;
    const id = pick(event);
    canvas.style.cursor = id ? 'pointer' : 'default';
    tooltip.hidden = !id;
    if (!id) return;
    tooltip.textContent = cases.entries.get(id).game.title;
    tooltip.style.left = Math.max(8, Math.min(viewport.clientWidth - 205, event.offsetX + 14)) + 'px';
    tooltip.style.top = Math.max(8, event.offsetY - 35) + 'px';
  });
  listen(canvas, 'pointerleave', () => { tooltip.hidden = true; pointerStart = null; });
  listen(canvas, 'pointercancel', () => { pointerStart = null; });
  listen(canvas, 'pointerdown', event => {
    if (event.isPrimary && event.button === 0) pointerStart = { x: event.clientX, y: event.clientY };
  });
  listen(canvas, 'pointerup', event => {
    if (!event.isPrimary || !pointerStart) return;
    const moved = Math.hypot(pointerStart.x - event.clientX, pointerStart.y - event.clientY);
    pointerStart = null;
    if (moved < 11) takeCase(pick(event));
  });
  listen(canvas, 'webglcontextlost', () => fail('WebGL context lost'));
  listen(picker, 'change', () => {
    pickButton.disabled = !picker.value;
    requestDraw();
  });
  listen(picker.closest('form'), 'submit', event => {
    event.preventDefault();
    takeCase(picker.value);
  });
  listen(toggle, 'click', () => {
    enabled = !enabled;
    selected = null;
    if (initialState) update(initialState);
  });
  listen(details, 'close', () => { selected = null; requestDraw(); });
  listen(document, 'visibilitychange', requestDraw);
  listen(reducedMotion, 'change', requestDraw);
  listen(window, 'pagehide', event => { if (!event.persisted) dispose(); });
  observer.observe(viewport);

  room = buildRoom(scene, requestDraw);
  window.PlayableShelf3D = { update };
  if (window.PLAYABLE_SHELF_3D_STATE) update(window.PLAYABLE_SHELF_3D_STATE);
}

try {
  startShelf();
} catch (error) {
  console.info('PLAYABLE is using 2D shelves.', error);
}
