const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const selectedBlockText = document.getElementById("selected-block");
const blockCountText = document.getElementById("block-count");

const TILE = 24;
const COLS = 120;
const ROWS = 40;
const GRAVITY = 0.35;

const BLOCKS = {
  0: { name: "Air", color: "transparent", solid: false },
  1: { name: "Grass", color: "#4AA64F", solid: true },
  2: { name: "Dirt", color: "#936037", solid: true },
  3: { name: "Stone", color: "#7A7A7A", solid: true },
  4: { name: "Wood", color: "#B3834D", solid: true }
};

const SELECTABLE = [1, 2, 3, 4];
let selectedIndex = 0;

const world = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

const player = {
  x: 10 * TILE,
  y: 8 * TILE,
  w: TILE * 0.8,
  h: TILE * 1.6,
  vx: 0,
  vy: 0,
  speed: 2.4,
  jump: 7.8,
  onGround: false,
  blocks: 0
};

const keys = {
  a: false,
  d: false,
  w: false,
  s: false,
  space: false
};

const camera = { x: 0, y: 0 };
let time = 0;

function generateWorld() {
  for (let x = 0; x < COLS; x += 1) {
    const baseHeight = 24 + Math.floor(Math.sin(x * 0.18) * 2 + Math.sin(x * 0.06) * 2);

    for (let y = baseHeight; y < ROWS; y += 1) {
      if (y === baseHeight) {
        world[y][x] = 1;
      } else if (y < baseHeight + 3) {
        world[y][x] = 2;
      } else {
        world[y][x] = 3;
      }
    }

    if (Math.random() < 0.09 && baseHeight > 8) {
      for (let t = 0; t < 4; t += 1) {
        world[baseHeight - 1 - t][x] = 4;
      }
    }
  }
}

function worldToScreen(wx, wy) {
  return {
    x: wx * TILE - camera.x,
    y: wy * TILE - camera.y
  };
}

function isSolidAtGrid(gx, gy) {
  if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return true;
  const id = world[gy][gx];
  return BLOCKS[id].solid;
}

function resolveHorizontal() {
  const left = Math.floor(player.x / TILE);
  const right = Math.floor((player.x + player.w) / TILE);
  const top = Math.floor(player.y / TILE);
  const bottom = Math.floor((player.y + player.h - 1) / TILE);

  if (player.vx > 0) {
    for (let y = top; y <= bottom; y += 1) {
      if (isSolidAtGrid(right, y)) {
        player.x = right * TILE - player.w - 0.01;
        player.vx = 0;
        break;
      }
    }
  }

  if (player.vx < 0) {
    for (let y = top; y <= bottom; y += 1) {
      if (isSolidAtGrid(left, y)) {
        player.x = (left + 1) * TILE + 0.01;
        player.vx = 0;
        break;
      }
    }
  }
}

function resolveVertical() {
  player.onGround = false;

  const left = Math.floor(player.x / TILE);
  const right = Math.floor((player.x + player.w - 1) / TILE);
  const top = Math.floor(player.y / TILE);
  const bottom = Math.floor((player.y + player.h) / TILE);

  if (player.vy > 0) {
    for (let x = left; x <= right; x += 1) {
      if (isSolidAtGrid(x, bottom)) {
        player.y = bottom * TILE - player.h - 0.01;
        player.vy = 0;
        player.onGround = true;
        break;
      }
    }
  }

  if (player.vy < 0) {
    for (let x = left; x <= right; x += 1) {
      if (isSolidAtGrid(x, top)) {
        player.y = (top + 1) * TILE + 0.01;
        player.vy = 0;
        break;
      }
    }
  }
}

function tickPlayer() {
  if (keys.a) player.vx = -player.speed;
  if (keys.d) player.vx = player.speed;
  if (!keys.a && !keys.d) player.vx *= 0.72;

  if (keys.space && player.onGround) {
    player.vy = -player.jump;
    player.onGround = false;
  }

  player.vy += GRAVITY;
  player.vy = Math.min(player.vy, 12);

  player.x += player.vx;
  resolveHorizontal();

  player.y += player.vy;
  resolveVertical();

  if (player.y > ROWS * TILE) {
    player.x = 10 * TILE;
    player.y = 8 * TILE;
    player.vx = 0;
    player.vy = 0;
  }
}

function drawBlock(id, sx, sy) {
  if (id === 0) return;

  ctx.fillStyle = BLOCKS[id].color;
  ctx.fillRect(sx, sy, TILE, TILE);

  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fillRect(sx + 1, sy + 1, TILE - 2, 4);

  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.strokeRect(sx + 0.5, sy + 0.5, TILE - 1, TILE - 1);
}

function drawWorld() {
  const startCol = Math.floor(camera.x / TILE);
  const endCol = startCol + Math.ceil(canvas.width / TILE) + 1;
  const startRow = Math.floor(camera.y / TILE);
  const endRow = startRow + Math.ceil(canvas.height / TILE) + 1;

  for (let y = startRow; y < endRow; y += 1) {
    if (y < 0 || y >= ROWS) continue;

    for (let x = startCol; x < endCol; x += 1) {
      if (x < 0 || x >= COLS) continue;
      const id = world[y][x];
      const p = worldToScreen(x, y);
      drawBlock(id, p.x, p.y);
    }
  }
}

function drawPlayer() {
  const sx = player.x - camera.x;
  const sy = player.y - camera.y;

  ctx.fillStyle = "#ffc28b";
  ctx.fillRect(sx + 3, sy + 2, player.w - 6, 8);

  ctx.fillStyle = "#c74e46";
  ctx.fillRect(sx, sy + 10, player.w, player.h - 10);

  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(sx + 4, sy + player.h - 6, player.w - 8, 6);
}

function drawSky() {
  const sunX = canvas.width - 120;
  const sunY = 80 + Math.sin(time * 0.006) * 14;

  ctx.fillStyle = "#ffe387";
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  for (let i = 0; i < 4; i += 1) {
    const cx = 180 + i * 170 + Math.sin(time * 0.002 + i) * 20;
    const cy = 80 + i * 10;
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.arc(cx + 18, cy + 6, 14, 0, Math.PI * 2);
    ctx.arc(cx - 16, cy + 8, 13, 0, Math.PI * 2);
    ctx.fill();
  }
}

function updateCamera() {
  camera.x = player.x - canvas.width * 0.5;
  camera.y = player.y - canvas.height * 0.55;

  camera.x = Math.max(0, Math.min(camera.x, COLS * TILE - canvas.width));
  camera.y = Math.max(0, Math.min(camera.y, ROWS * TILE - canvas.height));
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSky();
  drawWorld();
  drawPlayer();
}

function setHud() {
  const selected = SELECTABLE[selectedIndex];
  selectedBlockText.textContent = BLOCKS[selected].name;
  blockCountText.textContent = String(player.blocks);
}

function toGridFromClient(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const sx = (clientX - rect.left) * scaleX;
  const sy = (clientY - rect.top) * scaleY;

  return {
    gx: Math.floor((sx + camera.x) / TILE),
    gy: Math.floor((sy + camera.y) / TILE)
  };
}

function canInteract(gx, gy) {
  const px = player.x + player.w * 0.5;
  const py = player.y + player.h * 0.5;
  const tx = gx * TILE + TILE * 0.5;
  const ty = gy * TILE + TILE * 0.5;
  const distance = Math.hypot(px - tx, py - ty);
  return distance <= TILE * 5;
}

function playerOverlapsCell(gx, gy) {
  const cx = gx * TILE;
  const cy = gy * TILE;

  return (
    player.x < cx + TILE &&
    player.x + player.w > cx &&
    player.y < cy + TILE &&
    player.y + player.h > cy
  );
}

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

canvas.addEventListener("mousedown", (event) => {
  const { gx, gy } = toGridFromClient(event.clientX, event.clientY);
  if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return;
  if (!canInteract(gx, gy)) return;

  if (event.button === 0) {
    if (world[gy][gx] !== 0) {
      world[gy][gx] = 0;
      player.blocks += 1;
      setHud();
    }
  }

  if (event.button === 2) {
    if (world[gy][gx] === 0 && player.blocks > 0 && !playerOverlapsCell(gx, gy)) {
      const selected = SELECTABLE[selectedIndex];
      world[gy][gx] = selected;
      player.blocks -= 1;
      setHud();
    }
  }
});

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyA") keys.a = true;
  if (event.code === "KeyD") keys.d = true;
  if (event.code === "KeyW") keys.w = true;
  if (event.code === "KeyS") keys.s = true;
  if (event.code === "Space") {
    keys.space = true;
    event.preventDefault();
  }

  if (event.code === "KeyQ") {
    selectedIndex = (selectedIndex + 1) % SELECTABLE.length;
    setHud();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "KeyA") keys.a = false;
  if (event.code === "KeyD") keys.d = false;
  if (event.code === "KeyW") keys.w = false;
  if (event.code === "KeyS") keys.s = false;
  if (event.code === "Space") keys.space = false;
});

function resizeCanvasForMobile() {
  const isSmall = window.innerWidth < 700;
  if (isSmall) {
    canvas.width = 800;
    canvas.height = 500;
  } else {
    canvas.width = 960;
    canvas.height = 540;
  }
}

function loop() {
  time += 1;
  tickPlayer();
  updateCamera();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resizeCanvasForMobile);

generateWorld();
resizeCanvasForMobile();
setHud();
loop();
