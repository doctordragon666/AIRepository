const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const selectedBlockText = document.getElementById("selected-block");
const blockCountText = document.getElementById("block-count");

const WORLD_X = 40;
const WORLD_Z = 40;
const WORLD_Y = 14;

const BLOCKS = {
  0: { name: "Air", color: "#000000", solid: false },
  1: { name: "Grass", color: "#4aa64f", solid: true },
  2: { name: "Dirt", color: "#936037", solid: true },
  3: { name: "Stone", color: "#7a7a7a", solid: true },
  4: { name: "Wood", color: "#b3834d", solid: true }
};

const SELECTABLE = [1, 2, 3, 4];
let selectedIndex = 0;

const world = Array.from({ length: WORLD_Y }, () =>
  Array.from({ length: WORLD_Z }, () => Array(WORLD_X).fill(0))
);

const camera = {
  x: WORLD_X * 0.5,
  y: 8,
  z: WORLD_Z * 0.5,
  yaw: 0,
  pitch: -0.1,
  vy: 0,
  onGround: false,
  speed: 0.09,
  eyeHeight: 1.62,
  radius: 0.28,
  bodyHeight: 1.72,
  blocks: 0
};

const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  space: false,
  shift: false
};

const GRAVITY = 0.012;
const JUMP_SPEED = 0.24;
const MAX_FALL_SPEED = -0.45;
const LOOK_SPEED = 0.0022;
const INTERACT_DISTANCE = 6;

let time = 0;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shadeColor(hex, amount) {
  const c = parseInt(hex.slice(1), 16);
  const r = clamp((c >> 16) + amount, 0, 255);
  const g = clamp(((c >> 8) & 255) + amount, 0, 255);
  const b = clamp((c & 255) + amount, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function inBounds(x, y, z) {
  return x >= 0 && x < WORLD_X && y >= 0 && y < WORLD_Y && z >= 0 && z < WORLD_Z;
}

function getBlock(x, y, z) {
  if (!inBounds(x, y, z)) return 3;
  return world[y][z][x];
}

function setBlock(x, y, z, id) {
  if (!inBounds(x, y, z)) return;
  world[y][z][x] = id;
}

function isSolid(x, y, z) {
  const id = getBlock(x, y, z);
  return BLOCKS[id].solid;
}

function terrainHeight(x, z) {
  const v =
    Math.sin(x * 0.22) * 1.6 +
    Math.cos(z * 0.18) * 1.4 +
    Math.sin((x + z) * 0.08) * 2.1;
  return clamp(Math.floor(4 + v), 2, WORLD_Y - 3);
}

function generateWorld() {
  for (let z = 0; z < WORLD_Z; z += 1) {
    for (let x = 0; x < WORLD_X; x += 1) {
      const h = terrainHeight(x, z);
      for (let y = 0; y <= h; y += 1) {
        if (y === h) {
          setBlock(x, y, z, 1);
        } else if (y >= h - 2) {
          setBlock(x, y, z, 2);
        } else {
          setBlock(x, y, z, 3);
        }
      }

      if (Math.random() < 0.06 && h + 3 < WORLD_Y) {
        setBlock(x, h + 1, z, 4);
        setBlock(x, h + 2, z, 4);
      }
    }
  }

  const spawnY = terrainHeight(Math.floor(camera.x), Math.floor(camera.z)) + 2.2;
  camera.y = spawnY;
}

function getForward() {
  return {
    x: Math.sin(camera.yaw),
    y: Math.sin(camera.pitch),
    z: Math.cos(camera.yaw)
  };
}

function cameraToScreen(px, py, pz, focalLen) {
  const dx = px - camera.x;
  const dy = py - camera.y;
  const dz = pz - camera.z;

  const cosY = Math.cos(camera.yaw);
  const sinY = Math.sin(camera.yaw);
  const rx = dx * cosY - dz * sinY;
  const rzYaw = dx * sinY + dz * cosY;

  const cosP = Math.cos(camera.pitch);
  const sinP = Math.sin(camera.pitch);
  const ry = dy * cosP - rzYaw * sinP;
  const rz = dy * sinP + rzYaw * cosP;

  if (rz <= 0.08) return null;

  return {
    x: canvas.width * 0.5 + (rx / rz) * focalLen,
    y: canvas.height * 0.5 - (ry / rz) * focalLen,
    z: rz
  };
}

function drawBackground() {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, "#79c8ff");
  skyGrad.addColorStop(0.58, "#bfe9ff");
  skyGrad.addColorStop(0.58, "#9fcf7a");
  skyGrad.addColorStop(1, "#7a9d58");

  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sunY = 80 + Math.sin(time * 0.004) * 16;
  ctx.fillStyle = "rgba(255, 236, 145, 0.9)";
  ctx.beginPath();
  ctx.arc(canvas.width - 130, sunY, 28, 0, Math.PI * 2);
  ctx.fill();
}

function collectFaces(focalLen) {
  const faces = [];
  const renderRadius = 18;
  const cx = Math.floor(camera.x);
  const cz = Math.floor(camera.z);

  const faceDefs = [
    {
      normal: [0, 1, 0],
      shade: 32,
      verts: (x, y, z) => [
        [x, y + 1, z],
        [x + 1, y + 1, z],
        [x + 1, y + 1, z + 1],
        [x, y + 1, z + 1]
      ],
      neighbor: (x, y, z) => [x, y + 1, z]
    },
    {
      normal: [1, 0, 0],
      shade: -8,
      verts: (x, y, z) => [
        [x + 1, y, z],
        [x + 1, y + 1, z],
        [x + 1, y + 1, z + 1],
        [x + 1, y, z + 1]
      ],
      neighbor: (x, y, z) => [x + 1, y, z]
    },
    {
      normal: [-1, 0, 0],
      shade: -18,
      verts: (x, y, z) => [
        [x, y, z + 1],
        [x, y + 1, z + 1],
        [x, y + 1, z],
        [x, y, z]
      ],
      neighbor: (x, y, z) => [x - 1, y, z]
    },
    {
      normal: [0, 0, 1],
      shade: -4,
      verts: (x, y, z) => [
        [x, y, z + 1],
        [x + 1, y, z + 1],
        [x + 1, y + 1, z + 1],
        [x, y + 1, z + 1]
      ],
      neighbor: (x, y, z) => [x, y, z + 1]
    },
    {
      normal: [0, 0, -1],
      shade: -22,
      verts: (x, y, z) => [
        [x + 1, y, z],
        [x, y, z],
        [x, y + 1, z],
        [x + 1, y + 1, z]
      ],
      neighbor: (x, y, z) => [x, y, z - 1]
    }
  ];

  for (let y = 0; y < WORLD_Y; y += 1) {
    for (let z = Math.max(0, cz - renderRadius); z <= Math.min(WORLD_Z - 1, cz + renderRadius); z += 1) {
      for (let x = Math.max(0, cx - renderRadius); x <= Math.min(WORLD_X - 1, cx + renderRadius); x += 1) {
        const id = getBlock(x, y, z);
        if (id === 0) continue;

        const dist2 = (x + 0.5 - camera.x) ** 2 + (z + 0.5 - camera.z) ** 2;
        if (dist2 > renderRadius * renderRadius) continue;

        const baseColor = BLOCKS[id].color;

        for (const face of faceDefs) {
          const [nx, ny, nz] = face.neighbor(x, y, z);
          if (isSolid(nx, ny, nz)) continue;

          const verts = face.verts(x, y, z);
          const projected = [];
          let depthSum = 0;
          let clipped = false;

          for (const [vx, vy, vz] of verts) {
            const p = cameraToScreen(vx, vy, vz, focalLen);
            if (!p) {
              clipped = true;
              break;
            }
            depthSum += p.z;
            projected.push(p);
          }

          if (clipped) continue;

          const centerX = x + 0.5 - camera.x;
          const centerY = y + 0.5 - camera.y;
          const centerZ = z + 0.5 - camera.z;
          const facing =
            centerX * face.normal[0] + centerY * face.normal[1] + centerZ * face.normal[2];
          if (facing >= 0) continue;

          faces.push({
            points: projected,
            depth: depthSum / 4,
            color: shadeColor(baseColor, face.shade)
          });
        }
      }
    }
  }

  return faces;
}

function drawWorld() {
  const focalLen = canvas.width * 0.9;
  const faces = collectFaces(focalLen);
  faces.sort((a, b) => b.depth - a.depth);

  for (const face of faces) {
    ctx.beginPath();
    ctx.moveTo(face.points[0].x, face.points[0].y);
    ctx.lineTo(face.points[1].x, face.points[1].y);
    ctx.lineTo(face.points[2].x, face.points[2].y);
    ctx.lineTo(face.points[3].x, face.points[3].y);
    ctx.closePath();
    ctx.fillStyle = face.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
    ctx.stroke();
  }
}

function drawCrosshair() {
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy);
  ctx.lineTo(cx - 3, cy);
  ctx.moveTo(cx + 3, cy);
  ctx.lineTo(cx + 10, cy);
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx, cy - 3);
  ctx.moveTo(cx, cy + 3);
  ctx.lineTo(cx, cy + 10);
  ctx.stroke();
}

function collidesAt(x, y, z) {
  const minX = Math.floor(x - camera.radius);
  const maxX = Math.floor(x + camera.radius);
  const minY = Math.floor(y);
  const maxY = Math.floor(y + camera.bodyHeight);
  const minZ = Math.floor(z - camera.radius);
  const maxZ = Math.floor(z + camera.radius);

  for (let yy = minY; yy <= maxY; yy += 1) {
    for (let zz = minZ; zz <= maxZ; zz += 1) {
      for (let xx = minX; xx <= maxX; xx += 1) {
        if (isSolid(xx, yy, zz)) return true;
      }
    }
  }
  return false;
}

function tickMovement() {
  let moveX = 0;
  let moveZ = 0;

  const cosY = Math.cos(camera.yaw);
  const sinY = Math.sin(camera.yaw);

  if (keys.w) {
    moveX += sinY;
    moveZ += cosY;
  }
  if (keys.s) {
    moveX -= sinY;
    moveZ -= cosY;
  }
  if (keys.a) {
    moveX -= cosY;
    moveZ += sinY;
  }
  if (keys.d) {
    moveX += cosY;
    moveZ -= sinY;
  }

  const length = Math.hypot(moveX, moveZ) || 1;
  moveX = (moveX / length) * camera.speed;
  moveZ = (moveZ / length) * camera.speed;

  const candidateX = camera.x + moveX;
  if (!collidesAt(candidateX, camera.y, camera.z)) {
    camera.x = candidateX;
  }

  const candidateZ = camera.z + moveZ;
  if (!collidesAt(camera.x, camera.y, candidateZ)) {
    camera.z = candidateZ;
  }

  camera.vy -= GRAVITY;
  camera.vy = Math.max(camera.vy, MAX_FALL_SPEED);

  const nextY = camera.y + camera.vy;
  if (!collidesAt(camera.x, nextY, camera.z)) {
    camera.y = nextY;
    camera.onGround = false;
  } else {
    if (camera.vy < 0) {
      camera.onGround = true;
      camera.y = Math.floor(camera.y) + 0.001;
    }
    camera.vy = 0;
  }

  if (keys.space && camera.onGround) {
    camera.vy = JUMP_SPEED;
    camera.onGround = false;
  }

  if (keys.shift) {
    camera.speed = 0.14;
  } else {
    camera.speed = 0.09;
  }
}

function raycastBlock(maxDist) {
  const eyeY = camera.y + camera.eyeHeight;
  const dir = getForward();
  const norm = Math.hypot(dir.x, dir.y, dir.z) || 1;
  dir.x /= norm;
  dir.y /= norm;
  dir.z /= norm;

  let prev = null;

  for (let t = 0; t <= maxDist; t += 0.05) {
    const px = camera.x + dir.x * t;
    const py = eyeY + dir.y * t;
    const pz = camera.z + dir.z * t;

    const gx = Math.floor(px);
    const gy = Math.floor(py);
    const gz = Math.floor(pz);

    if (!inBounds(gx, gy, gz)) break;

    if (isSolid(gx, gy, gz)) {
      return {
        hit: { x: gx, y: gy, z: gz },
        place: prev
      };
    }

    prev = { x: gx, y: gy, z: gz };
  }

  return null;
}

function playerWouldOverlapBlock(gx, gy, gz) {
  const pxMin = camera.x - camera.radius;
  const pxMax = camera.x + camera.radius;
  const pyMin = camera.y;
  const pyMax = camera.y + camera.bodyHeight;
  const pzMin = camera.z - camera.radius;
  const pzMax = camera.z + camera.radius;

  const bxMin = gx;
  const bxMax = gx + 1;
  const byMin = gy;
  const byMax = gy + 1;
  const bzMin = gz;
  const bzMax = gz + 1;

  return (
    pxMin < bxMax &&
    pxMax > bxMin &&
    pyMin < byMax &&
    pyMax > byMin &&
    pzMin < bzMax &&
    pzMax > bzMin
  );
}

function setHud() {
  const selected = SELECTABLE[selectedIndex];
  selectedBlockText.textContent = BLOCKS[selected].name;
  blockCountText.textContent = String(camera.blocks);
}

function render() {
  drawBackground();
  drawWorld();
  drawCrosshair();
}

function loop() {
  time += 1;
  tickMovement();
  render();
  requestAnimationFrame(loop);
}

function resizeCanvasForMobile() {
  const isSmall = window.innerWidth < 700;
  if (isSmall) {
    canvas.width = 860;
    canvas.height = 520;
  } else {
    canvas.width = 960;
    canvas.height = 540;
  }
}

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

canvas.addEventListener("click", () => {
  if (document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
  }
});

window.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement !== canvas) return;
  camera.yaw += event.movementX * LOOK_SPEED;
  camera.pitch -= event.movementY * LOOK_SPEED;
  camera.pitch = clamp(camera.pitch, -1.25, 1.25);
});

canvas.addEventListener("mousedown", (event) => {
  const target = raycastBlock(INTERACT_DISTANCE);
  if (!target) return;

  if (event.button === 0) {
    const { x, y, z } = target.hit;
    setBlock(x, y, z, 0);
    camera.blocks += 1;
    setHud();
  }

  if (event.button === 2 && target.place && camera.blocks > 0) {
    const { x, y, z } = target.place;
    if (!inBounds(x, y, z)) return;
    if (getBlock(x, y, z) !== 0) return;
    if (playerWouldOverlapBlock(x, y, z)) return;

    const selected = SELECTABLE[selectedIndex];
    setBlock(x, y, z, selected);
    camera.blocks -= 1;
    setHud();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyW") keys.w = true;
  if (event.code === "KeyA") keys.a = true;
  if (event.code === "KeyS") keys.s = true;
  if (event.code === "KeyD") keys.d = true;
  if (event.code === "Space") {
    keys.space = true;
    event.preventDefault();
  }
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") keys.shift = true;

  if (event.code === "KeyQ") {
    selectedIndex = (selectedIndex + 1) % SELECTABLE.length;
    setHud();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "KeyW") keys.w = false;
  if (event.code === "KeyA") keys.a = false;
  if (event.code === "KeyS") keys.s = false;
  if (event.code === "KeyD") keys.d = false;
  if (event.code === "Space") keys.space = false;
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") keys.shift = false;
});

window.addEventListener("resize", resizeCanvasForMobile);

generateWorld();
resizeCanvasForMobile();
setHud();
loop();