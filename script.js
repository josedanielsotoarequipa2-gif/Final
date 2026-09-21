
const canvas = document.getElementById('canvas3d');
const ctx = canvas.getContext('2d');
const toggleBtn = document.getElementById('toggleBtn');
const resetCamBtn = document.getElementById('resetCamBtn');

// --- CONTROL DE MÚSICA DE FONDO ---
const bgMusic = document.getElementById('bgMusic');
const musicBtn = document.getElementById('musicBtn');
let isPlaying = false;

// Función para alternar reproducir / pausar con el botón
if (musicBtn && bgMusic) {
  musicBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Evitar interferir con la rotación del canvas
    if (isPlaying) {
      bgMusic.pause();
      musicBtn.textContent = '🎵 Reproducir Música';
    } else {
      bgMusic.play().then(() => {
        musicBtn.textContent = '⏸️ Pausar Música';
      }).catch(err => console.log("Error al reproducir audio:", err));
    }
    isPlaying = !isPlaying;
  });

  // Autoplay con la primera interacción del usuario en la pantalla
  function iniciarMusicaEnPrimerClic() {
    if (!isPlaying && bgMusic) {
      bgMusic.play().then(() => {
        isPlaying = true;
        musicBtn.textContent = '⏸️ Pausar Música';
      }).catch(() => {});
    }
    window.removeEventListener('click', iniciarMusicaEnPrimerClic);
    window.removeEventListener('touchstart', iniciarMusicaEnPrimerClic);
  }

  window.addEventListener('click', iniciarMusicaEnPrimerClic);
  window.addEventListener('touchstart', iniciarMusicaEnPrimerClic);
}

let width, height, fov;
const NUM_PARTICULAS_CORAZON = 1500;
const NUM_PARTICULAS_ESTRELLA = 800; // Cantidad de partículas para la estrella
const NUM_PARTICULAS_GALAXIA = 2000;
const NUM_PARTICULAS_AMBIENTE = 250;

// --- CONFIGURACIÓN DE IMÁGENES ---
const listaImagenes = [
  'Imagenes/IMG_0260.JPEG',
  'Imagenes/IMG_0290.JPEG',
  'Imagenes/IMG_0408.JPEG',
  'Imagenes/WhatsApp Image 2026-09-21 at 12.00.04 AM.jpeg',
  'Imagenes/WhatsApp Image 2026-09-21 at 12.00.05 AM.jpeg',
  'Imagenes/IMG_0306.JPEG',
  'Imagenes/3DC43ABD-C536-44CE-8B94-BEA2F8E4D018.JPEG',
  'Imagenes/IMG_0099.JPEG'
];

let particulasCorazon = [];
let particulasEstrella = [];
let particulasGalaxia = [];
let particulasAmbiente = [];
let elementosTexto = [];
let formandoCorazon = true;

// Variables de rotación y cámara
let targetRotX = 0;
let targetRotY = 0;
let rotX = 0;
let rotY = 0;

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  fov = Math.min(width, height) * 0.8;
}
window.addEventListener('resize', resize);
resize();

// 1. Posición del Corazón
function getHeartPosition() {
  const t = Math.random() * Math.PI * 2;
  const u = (Math.random() - 0.5) * Math.PI;

  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
  const z = u * 6 * Math.sin(t);

  const scale = Math.min(width, height) / 45;

  return {
    x: x * scale,
    y: (y - 5) * scale,
    z: z * scale
  };
}

// 2. Posición exterior alrededor del corazón (para las imágenes)
function getOuterPosition() {
  const angle = Math.random() * Math.PI * 2;
  const distance = (Math.min(width, height) / 2) * (0.8 + Math.random() * 0.5);
  const heightOffset = (Math.random() - 0.5) * (Math.min(width, height) * 0.6);

  return {
    x: Math.cos(angle) * distance,
    y: heightOffset,
    z: Math.sin(angle) * distance
  };
}

// 3. Posición de la Estrella de 5 puntas hecha de partículas
function getStarPosition() {
  const puntas = 5;
  const theta = Math.random() * Math.PI * 2;
  const scale = Math.min(width, height) / 8;

  // Modulación polar para crear una estrella de 5 puntas
  const rMax = 0.4 + 0.6 * Math.abs(Math.cos((puntas * theta) / 2));
  const r = Math.sqrt(Math.random()) * rMax;

  // Centro más dorado/blanco, puntas más amarillas/brillantes
  const isCenter = r < 0.25;
  const hue = isCenter ? Math.random() * 20 + 40 : Math.random() * 15 + 45;
  const lightness = isCenter ? Math.random() * 20 + 75 : Math.random() * 20 + 55;

  return {
    x: r * Math.cos(theta - Math.PI / 2) * scale,
    y: r * Math.sin(theta - Math.PI / 2) * scale - scale * 0.3,
    z: (Math.random() - 0.5) * 15,
    color: `hsl(${hue}, 100%, ${lightness}%)`
  };
}

// 4. Posición de la Galaxia
function getGalaxyPosition() {
  const arms = 2;
  const armIndex = Math.floor(Math.random() * arms);
  const armAngle = (armIndex * 2 * Math.PI) / arms;

  const r = Math.pow(Math.random(), 2) * (Math.min(width, height) * 0.45);
  const theta = r * 0.015 + armAngle + (Math.random() - 0.5) * 0.4;

  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);
  const y = (Math.random() - 0.5) * (30 + (1 - r / (Math.min(width, height) * 0.45)) * 40);

  const offsetY = Math.min(width, height) * 0.35;

  return {
    x: x,
    y: y + offsetY,
    z: z,
    distFromCenter: r
  };
}

// CLASE: Partículas del Corazón
class ParticulaCorazon {
  constructor(rutaImagen = null) {
    this.tieneImagen = false;
    if (rutaImagen) {
      this.imagen = new Image();
      this.imagen.src = rutaImagen;
      this.imagen.onload = () => {
        this.tieneImagen = true;
      };
    }
    this.reset();
  }

  reset() {
    const maxDist = Math.max(width, height);
    this.freeX = (Math.random() - 0.5) * maxDist * 1.5;
    this.freeY = (Math.random() - 0.5) * maxDist * 1.5;
    this.freeZ = (Math.random() - 0.5) * maxDist * 1.5;

    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = (Math.random() - 0.5) * 1.5;
    this.vz = (Math.random() - 0.5) * 1.5;

    const target = this.imagen !== undefined ? getOuterPosition() : getHeartPosition();
    this.targetX = target.x;
    this.targetY = target.y;
    this.targetZ = target.z;

    this.x = this.freeX;
    this.y = this.freeY;
    this.z = this.freeZ;

    this.size = Math.random() * 2 + 1;
    this.color = `hsl(${Math.random() * 20 + 40}, 100%, 60%)`;
  }

  actualizar() {
    if (formandoCorazon) {
      this.x += (this.targetX - this.x) * 0.04;
      this.y += (this.targetY - this.y) * 0.04;
      this.z += (this.targetZ - this.z) * 0.04;
    } else {
      this.freeX += this.vx;
      this.freeY += this.vy;
      this.freeZ += this.vz;

      const limit = Math.max(width, height);
      if (Math.abs(this.freeX) > limit) this.vx *= -1;
      if (Math.abs(this.freeY) > limit) this.vy *= -1;
      if (Math.abs(this.freeZ) > limit) this.vz *= -1;

      this.x += (this.freeX - this.x) * 0.04;
      this.y += (this.freeY - this.y) * 0.04;
      this.z += (this.freeZ - this.z) * 0.04;
    }
  }

  proyectar(rotX, rotY) {
    let x1 = this.x * Math.cos(rotY) - this.z * Math.sin(rotY);
    let z1 = this.z * Math.cos(rotY) + this.x * Math.sin(rotY);

    let y2 = this.y * Math.cos(rotX) - z1 * Math.sin(rotX);
    let z2 = z1 * Math.cos(rotX) + this.y * Math.sin(rotX);

    const distance = fov;
    const scale = distance / (distance + z2 + 500);

    return {
      px: x1 * scale + width / 2,
      py: y2 * scale + height / 2,
      scale: Math.max(0.1, scale),
      z: z2
    };
  }

  dibujar(proj) {
    if (this.tieneImagen) {
      const baseSize = 160 * proj.scale; 
      const aspectRatio = this.imagen.width / this.imagen.height || 1;
      
      let imgW = baseSize;
      let imgH = baseSize;

      if (aspectRatio > 1) {
        imgH = baseSize / aspectRatio;
      } else {
        imgW = baseSize * aspectRatio;
      }

      ctx.drawImage(
        this.imagen,
        proj.px - imgW / 2,
        proj.py - imgH / 2,
        imgW,
        imgH
      );
    } else {
      const size = this.size * proj.scale;
      ctx.beginPath();
      ctx.arc(proj.px, proj.py, size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
  }
}

// CLASE: Partículas de la Estrella
class ParticulaEstrella {
  constructor() {
    this.reset();
  }

  reset() {
    const maxDist = Math.max(width, height);
    this.freeX = (Math.random() - 0.5) * maxDist * 1.5;
    this.freeY = (Math.random() - 0.5) * maxDist * 1.5;
    this.freeZ = (Math.random() - 0.5) * maxDist * 1.5;

    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = (Math.random() - 0.5) * 1.5;
    this.vz = (Math.random() - 0.5) * 1.5;

    const target = getStarPosition();
    this.targetX = target.x;
    this.targetY = target.y;
    this.targetZ = target.z;
    this.color = target.color;

    this.x = this.freeX;
    this.y = this.freeY;
    this.z = this.freeZ;

    this.size = Math.random() * 2 + 1.2;
  }

  actualizar() {
    if (formandoCorazon) {
      this.x += (this.targetX - this.x) * 0.04;
      this.y += (this.targetY - this.y) * 0.04;
      this.z += (this.targetZ - this.z) * 0.04;
    } else {
      this.freeX += this.vx;
      this.freeY += this.vy;
      this.freeZ += this.vz;

      const limit = Math.max(width, height);
      if (Math.abs(this.freeX) > limit) this.vx *= -1;
      if (Math.abs(this.freeY) > limit) this.vy *= -1;
      if (Math.abs(this.freeZ) > limit) this.vz *= -1;

      this.x += (this.freeX - this.x) * 0.04;
      this.y += (this.freeY - this.y) * 0.04;
      this.z += (this.freeZ - this.z) * 0.04;
    }
  }

  proyectar(rotX, rotY) {
    let x1 = this.x * Math.cos(rotY) - this.z * Math.sin(rotY);
    let z1 = this.z * Math.cos(rotY) + this.x * Math.sin(rotY);

    let y2 = this.y * Math.cos(rotX) - z1 * Math.sin(rotX);
    let z2 = z1 * Math.cos(rotX) + this.y * Math.sin(rotX);

    const distance = fov;
    const scale = distance / (distance + z2 + 500);

    return {
      px: x1 * scale + width / 2,
      py: y2 * scale + height / 2,
      scale: Math.max(0.1, scale),
      z: z2
    };
  }

  dibujar(proj) {
    const size = this.size * proj.scale;
    ctx.beginPath();
    ctx.arc(proj.px, proj.py, size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

// CLASE: Partículas de la Galaxia
class ParticulaGalaxia {
  constructor() {
    const pos = getGalaxyPosition();
    this.x = pos.x;
    this.y = pos.y;
    this.z = pos.z;

    this.angle = Math.atan2(pos.z, pos.x);
    this.radius = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    this.speed = (0.005 + (1 / (this.radius + 10)) * 2) * (Math.random() * 0.4 + 0.8);

    this.size = Math.random() * 1.8 + 0.8;

    if (this.radius < Math.min(width, height) * 0.1) {
      const lightness = Math.random() * 15 + 85;
      this.color = `hsl(0, 0%, ${lightness}%)`;
    } else {
      const lightness = Math.random() * 35 + 40;
      this.color = `hsl(0, 0%, ${lightness}%)`;
    }
  }

  actualizar() {
    this.angle += this.speed;
    this.x = this.radius * Math.cos(this.angle);
    this.z = this.radius * Math.sin(this.angle);
  }

  proyectar(rotX, rotY) {
    let x1 = this.x * Math.cos(rotY) - this.z * Math.sin(rotY);
    let z1 = this.z * Math.cos(rotY) + this.x * Math.sin(rotY);

    let y2 = this.y * Math.cos(rotX) - z1 * Math.sin(rotX);
    let z2 = z1 * Math.cos(rotX) + this.y * Math.sin(rotX);

    const distance = fov;
    const scale = distance / (distance + z2 + 500);

    return {
      px: x1 * scale + width / 2,
      py: y2 * scale + height / 2,
      scale: Math.max(0.1, scale),
      z: z2
    };
  }

  dibujar(proj) {
    const size = this.size * proj.scale;
    ctx.beginPath();
    ctx.arc(proj.px, proj.py, size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

// CLASE: Partículas Ambientales
class ParticulaAmbiente {
  constructor() {
    this.reset();
  }

  reset() {
    const maxDist = Math.max(width, height) * 1.8;
    this.x = (Math.random() - 0.5) * maxDist;
    this.y = (Math.random() - 0.5) * maxDist;
    this.z = (Math.random() - 0.5) * maxDist;

    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.vz = (Math.random() - 0.5) * 0.4;

    this.size = Math.random() * 1.2 + 0.5;
    this.color = `hsl(${Math.random() * 60 + 200}, 80%, ${Math.random() * 30 + 60}%)`;
  }

  actualizar() {
    this.x += this.vx;
    this.y += this.vy;
    this.z += this.vz;

    const limit = Math.max(width, height) * 1.2;
    if (Math.abs(this.x) > limit) this.vx *= -1;
    if (Math.abs(this.y) > limit) this.vy *= -1;
    if (Math.abs(this.z) > limit) this.vz *= -1;
  }

  proyectar(rotX, rotY) {
    let x1 = this.x * Math.cos(rotY) - this.z * Math.sin(rotY);
    let z1 = this.z * Math.cos(rotY) + this.x * Math.sin(rotY);

    let y2 = this.y * Math.cos(rotX) - z1 * Math.sin(rotX);
    let z2 = z1 * Math.cos(rotX) + this.y * Math.sin(rotX);

    const distance = fov;
    const scale = distance / (distance + z2 + 500);

    return {
      px: x1 * scale + width / 2,
      py: y2 * scale + height / 2,
      scale: Math.max(0.1, scale),
      z: z2
    };
  }

  dibujar(proj) {
    const size = this.size * proj.scale;
    ctx.beginPath();
    ctx.arc(proj.px, proj.py, size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

// CLASE: Textos 3D
class Texto3D {
  constructor(texto, x, y, z, color = '#ff71ce') {
    this.texto = texto;
    this.x = x;
    this.y = y;
    this.z = z;
    this.color = color;
  }

  actualizar() {}

  proyectar(rotX, rotY) {
    let x1 = this.x * Math.cos(rotY) - this.z * Math.sin(rotY);
    let z1 = this.z * Math.cos(rotY) + this.x * Math.sin(rotY);

    let y2 = this.y * Math.cos(rotX) - z1 * Math.sin(rotX);
    let z2 = z1 * Math.cos(rotX) + this.y * Math.sin(rotX);

    const distance = fov;
    const scale = distance / (distance + z2 + 500);

    return {
      px: x1 * scale + width / 2,
      py: y2 * scale + height / 2,
      scale: Math.max(0.1, scale),
      z: z2
    };
  }

  dibujar(proj) {
    const fontSize = Math.max(12, 20 * proj.scale);
    ctx.font = `bold ${fontSize}px 'Segoe UI', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lineas = this.texto.split('\n');
    const lineHeight = fontSize * 1.2;

    const startY = proj.py - ((lineas.length - 1) * lineHeight) / 2;

    lineas.forEach((linea, index) => {
      const currentY = startY + index * lineHeight;

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.lineWidth = 4 * proj.scale;
      ctx.strokeText(linea, proj.px, currentY);

      ctx.fillStyle = this.color;
      ctx.fillText(linea, proj.px, currentY);
    });
  }
}

// --- CREACIÓN DE ENTIDADES ---
// 1. Crear imágenes
listaImagenes.forEach(ruta => {
  particulasCorazon.push(new ParticulaCorazon(ruta));
});

// 2. Llenar el resto del corazón con partículas
const puntosRestantes = NUM_PARTICULAS_CORAZON - listaImagenes.length;
for (let i = 0; i < puntosRestantes; i++) {
  particulasCorazon.push(new ParticulaCorazon(null));
}

// 3. Crear partículas de la Estrella
for (let i = 0; i < NUM_PARTICULAS_ESTRELLA; i++) {
  particulasEstrella.push(new ParticulaEstrella());
}

for (let i = 0; i < NUM_PARTICULAS_GALAXIA; i++) particulasGalaxia.push(new ParticulaGalaxia());
for (let i = 0; i < NUM_PARTICULAS_AMBIENTE; i++) particulasAmbiente.push(new ParticulaAmbiente());

const mensajes = [
  "Quisiera verte una y otra vez\nPero fugaz es tu esencia y eso lo sé ",
  "No quiero estar en otro lugar\nDonde no pueda amarte ",
  "Te voy a querer\nhasta que el inicio se convine con el final",
  "Tu sonrisa es parte\nde mi debilidad",
  "Entre nebulosas de neón vos\nbrillabas como un sol eterno\nIluminando mi mundo para siempre",
  "Quédate conmigo, mayby\nJuntos, amor, para siempre",
  "Me cambio la vida el conocerte\nyo ya no quisiera vivir sin ti"
];

const radioAlrededor = 390;
const coloresTexto = ["#ff2a6d", "#05ffa1", "#00f5ff", "#ffe600", "#ff71ce", "#ffffff", "#47af16"];

mensajes.forEach((msg, i) => {
  const angle = (i / mensajes.length) * Math.PI * 2;

  const x = Math.cos(angle) * radioAlrededor;
  const z = Math.sin(angle) * radioAlrededor;
  const y = Math.sin(angle * 2) * 300;
  elementosTexto.push(new Texto3D(msg, x, y, z, coloresTexto[i % coloresTexto.length]));
});

// Eventos de ratón
window.addEventListener('mousedown', (e) => {
  isDragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const deltaX = e.clientX - lastMouseX;
  const deltaY = e.clientY - lastMouseY;

  targetRotY += deltaX * 0.005;
  targetRotX += deltaY * 0.005;

  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});

window.addEventListener('mouseup', () => isDragging = false);

// Eventos táctiles
window.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    isDragging = true;
    lastMouseX = e.touches[0].clientX;
    lastMouseY = e.touches[0].clientY;
  }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  if (!isDragging || e.touches.length !== 1) return;
  e.preventDefault();
  const deltaX = e.touches[0].clientX - lastMouseX;
  const deltaY = e.touches[0].clientY - lastMouseY;

  targetRotY += deltaX * 0.005;
  targetRotX += deltaY * 0.005;

  lastMouseX = e.touches[0].clientX;
  lastMouseY = e.touches[0].clientY;
}, { passive: false });

window.addEventListener('touchend', () => isDragging = false);

// Botones UI
toggleBtn.addEventListener('click', () => formandoCorazon = !formandoCorazon);
resetCamBtn.addEventListener('click', () => { targetRotX = 0; targetRotY = 0; });

// Bucle principal
function animar() {
  rotX += (targetRotX - rotX) * 0.1;
  rotY += (targetRotY - rotY) * 0.1;

  if (!isDragging) {
    targetRotY += 0.002;
  }

  ctx.fillStyle = 'rgba(5, 5, 13, 0.25)';
  ctx.fillRect(0, 0, width, height);

  const renderList = [];

  const todasLasEntidades = [
    ...particulasCorazon,
    ...particulasEstrella,
    ...particulasGalaxia,
    ...particulasAmbiente,
    ...elementosTexto
  ];

  for (let entidad of todasLasEntidades) {
    entidad.actualizar();
    const proj = entidad.proyectar(rotX, rotY);
    renderList.push({
      item: entidad,
      proj: proj,
      z: proj.z
    });
  }

  renderList.sort((a, b) => b.z - a.z);

  for (let obj of renderList) {
    if (
      obj.item instanceof Texto3D ||
      (obj.item instanceof ParticulaCorazon && obj.item.tieneImagen)
    ) {
      ctx.globalCompositeOperation = 'source-over';
      obj.item.dibujar(obj.proj);
    } else {
      ctx.globalCompositeOperation = 'lighter';
      obj.item.dibujar(obj.proj);
    }
  }

  ctx.globalCompositeOperation = 'source-over';
  requestAnimationFrame(animar);
}

animar();