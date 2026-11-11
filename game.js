const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const stage = document.querySelector('.game-stage');
const messageLayer = document.getElementById('messageLayer');
const gameOverLayer = document.getElementById('gameOverLayer');
const pauseLayer = document.getElementById('pauseLayer');
const scoreValue = document.getElementById('scoreValue');
const bestValue = document.getElementById('bestValue');
const finalScore = document.getElementById('finalScore');
const comboReadout = document.getElementById('comboReadout');
const statusPill = document.getElementById('statusPill');
const sectorLabel = document.getElementById('sectorLabel');
const runNote = document.getElementById('runNote');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const pauseButton = document.getElementById('pauseButton');
const resumeButton = document.getElementById('resumeButton');
const soundButton = document.getElementById('soundButton');

const keys = new Set();
const palette = ['#92f7dc', '#c4ffe8', '#ffb28f', '#fff0bd'];
let width = 0;
let height = 0;
let animationId = 0;
let lastTime = 0;
let game = null;
let soundOn = true;
let audioContext = null;
let best = Number(localStorage.getItem('lumen-drift-best') || 0);
bestValue.textContent = formatScore(best);

function formatScore(value) { return String(Math.max(0, Math.floor(value))).padStart(6, '0'); }

function resizeCanvas() {
    const bounds = stage.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = bounds.width;
    height = bounds.height;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function random(min, max) { return min + Math.random() * (max - min); }

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function createStars() {
    return Array.from({ length: Math.floor(width / 13) }, () => ({ x: random(0, width), y: random(0, height), size: random(.4, 1.8), alpha: random(.1, .6), twinkle: random(1, 4), phase: random(0, Math.PI * 2) }));
}

function createGame() {
    return { running: true, paused: false, elapsed: 0, score: 0, combo: 1, collected: 0, speed: 1, sector: 1, spawnTimer: .3, voidTimer: 2.4, spark: makeSpark(), voids: [], particles: [], stars: createStars(), player: { x: width / 2, y: height / 2, radius: 8, trail: [] } };
}

function makeSpark() {
    const angle = random(0, Math.PI * 2);
    const radius = random(35, Math.min(width, height) * .38);
    return { x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius, radius: random(5, 8), pulse: random(0, Math.PI * 2), color: palette[Math.floor(random(0, palette.length))] };
}

function makeVoid() {
    const side = Math.floor(random(0, 4));
    const pad = 30;
    const position = side === 0 ? { x: random(pad, width - pad), y: -30 } : side === 1 ? { x: width + 30, y: random(pad, height - pad) } : side === 2 ? { x: random(pad, width - pad), y: height + 30 } : { x: -30, y: random(pad, height - pad) };
    return {...position, radius: random(13, 22), speed: random(16, 29) * game.speed, life: 0, maxLife: random(7, 11), phase: random(0, 7) };
}

function burst(x, y, color, count = 14) {
    for (let index = 0; index < count; index += 1) {
        const angle = random(0, Math.PI * 2);
        const speed = random(20, 85);
        game.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: random(.4, .9), maxLife: .9, size: random(1, 3), color });
    }
}

function startGame() {
    resizeCanvas();
    game = createGame();
    messageLayer.classList.add('hidden');
    gameOverLayer.classList.add('hidden');
    pauseLayer.classList.add('hidden');
    pauseButton.textContent = 'Pause';
    lastTime = performance.now();
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(loop);
    tone(460, .05, 'sine');
}

function endGame() {
    game.running = false;
    burst(game.player.x, game.player.y, '#ff876f', 28);
    const score = Math.floor(game.score);
    if (score > best) {
        best = score;
        localStorage.setItem('lumen-drift-best', String(best));
        bestValue.textContent = formatScore(best);
    }
    finalScore.textContent = formatScore(score);
    runNote.textContent = game.collected > 8 ? 'The light remembers your route.' : 'Every spark leaves a trace.';
    gameOverLayer.classList.remove('hidden');
    pauseButton.textContent = 'Pause';
    tone(100, .24, 'sawtooth');
}

function togglePause() {
    if (!game || !game.running) return;
    game.paused = !game.paused;
    pauseLayer.classList.toggle('hidden', !game.paused);
    pauseButton.textContent = game.paused ? 'Resume' : 'Pause';
    if (!game.paused) {
        lastTime = performance.now();
        animationId = requestAnimationFrame(loop);
    }
}

function update(delta) {
    if (!game.running || game.paused) return;
    game.elapsed += delta;
    game.speed = 1 + Math.min(game.elapsed / 48, 1.8);
    game.score += delta * (5 + game.combo * 1.5);
    const nextSector = Math.floor(game.elapsed / 15) + 1;
    if (nextSector !== game.sector) {
        game.sector = nextSector;
        tone(680, .06, 'triangle');
    }
    statusPill.textContent = `SECTOR ${String(game.sector).padStart(2, '0')}`;
    sectorLabel.textContent = `THE BLUE HOUR / SECTOR ${String(game.sector).padStart(2, '0')}`;
    const player = game.player;
    const horizontal = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0);
    const vertical = (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('w') ? 1 : 0);
    const movement = 185 + game.speed * 22;
    player.x = Math.max(19, Math.min(width - 19, player.x + horizontal * movement * delta));
    player.y = Math.max(19, Math.min(height - 19, player.y + vertical * movement * delta));
    player.trail.push({ x: player.x, y: player.y, life: .65 });
    if (player.trail.length > 22) player.trail.shift();
    player.trail.forEach(point => { point.life -= delta; });
    game.spark.pulse += delta * 4;
    if (distance(player, game.spark) < player.radius + game.spark.radius + 9) {
        const collected = game.spark;
        game.collected += 1;
        game.combo = Math.min(9, game.combo + 1);
        game.score += 45 * game.combo;
        burst(collected.x, collected.y, collected.color, 18);
        game.spark = makeSpark();
        comboReadout.textContent = `x${game.combo} COMBO`;
        tone(580 + game.combo * 40, .08, 'sine');
    }
    game.spawnTimer -= delta;
    if (game.spawnTimer <= 0) {
        game.voids.push(makeVoid());
        game.spawnTimer = Math.max(.45, 1.25 - game.elapsed / 100) * random(.7, 1.2);
    }
    game.voidTimer -= delta;
    if (game.voidTimer <= 0) {
        game.voids.push(makeVoid());
        game.voidTimer = random(2.4, 4.5) / Math.min(game.speed, 2.2);
    }
    game.voids.forEach(voidOrb => {
        const angle = Math.atan2(player.y - voidOrb.y, player.x - voidOrb.x);
        voidOrb.x += Math.cos(angle) * voidOrb.speed * delta;
        voidOrb.y += Math.sin(angle) * voidOrb.speed * delta;
        voidOrb.life += delta;
    });
    game.voids = game.voids.filter(voidOrb => voidOrb.life < voidOrb.maxLife && voidOrb.x > -80 && voidOrb.x < width + 80 && voidOrb.y > -80 && voidOrb.y < height + 80);
    for (const voidOrb of game.voids)
        if (distance(player, voidOrb) < player.radius + voidOrb.radius * .72) { endGame(); return; }
    game.particles.forEach(particle => {
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.vx *= .97;
        particle.vy *= .97;
        particle.life -= delta;
    });
    game.particles = game.particles.filter(particle => particle.life > 0);
    scoreValue.textContent = formatScore(game.score);
}

function drawBackground(time) {
    const gradient = ctx.createRadialGradient(width * .5, height * .48, 0, width * .5, height * .48, Math.max(width, height) * .75);
    gradient.addColorStop(0, '#13343a');
    gradient.addColorStop(.4, '#0b252b');
    gradient.addColorStop(1, '#061216');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    game.stars.forEach(star => {
        const alpha = star.alpha * (.7 + Math.sin(time * star.twinkle + star.phase) * .3);
        ctx.fillStyle = `rgba(183, 246, 225, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.strokeStyle = 'rgba(146, 247, 220, .035)';
    ctx.lineWidth = 1;
    for (let radius = 85; radius < Math.max(width, height); radius += 85) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, radius + Math.sin(time * .4 + radius) * 2, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawSpark(time) {
    const spark = game.spark;
    const pulse = 1 + Math.sin(spark.pulse) * .18;
    ctx.save();
    ctx.translate(spark.x, spark.y);
    ctx.rotate(time * .4);
    ctx.shadowBlur = 24;
    ctx.shadowColor = spark.color;
    ctx.fillStyle = spark.color;
    ctx.beginPath();
    ctx.moveTo(0, -12 * pulse);
    ctx.lineTo(5 * pulse, 0);
    ctx.lineTo(0, 12 * pulse);
    ctx.lineTo(-5 * pulse, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = spark.color;
    ctx.globalAlpha = .35;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 18 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawVoids() {
    game.voids.forEach(voidOrb => {
        const fade = Math.min(1, voidOrb.life * 2, (voidOrb.maxLife - voidOrb.life) * 2);
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#ff876f';
        ctx.strokeStyle = '#ff876f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(voidOrb.x, voidOrb.y, voidOrb.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = fade * .3;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(voidOrb.x, voidOrb.y, voidOrb.radius * .65, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    });
}

function drawPlayer() {
    const player = game.player;
    player.trail.forEach(point => {
        if (point.life <= 0) return;
        ctx.globalAlpha = point.life * .28;
        ctx.fillStyle = '#92f7dc';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3 * point.life, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.shadowBlur = 28;
    ctx.shadowColor = '#92f7dc';
    ctx.fillStyle = '#eafff6';
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#92f7dc';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawParticles() {
    game.particles.forEach(particle => {
        ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

function render(time) {
    drawBackground(time / 1000);
    drawSpark(time / 1000);
    drawVoids();
    drawParticles();
    drawPlayer();
}

function loop(time) {
    const delta = Math.min(.035, (time - lastTime) / 1000);
    lastTime = time;
    update(delta);
    render(time);
    if (game && game.running && !game.paused) animationId = requestAnimationFrame(loop);
}

function tone(frequency, duration, type) {
    if (!soundOn) return;
    try {
        if (!audioContext) audioContext = new(window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(.035, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    } catch (error) { /* Audio is optional. */ }
}
window.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    if (event.key === ' ') togglePause();
    keys.add(event.key);
});
window.addEventListener('keyup', event => keys.delete(event.key));
window.addEventListener('resize', () => { resizeCanvas(); if (game) game.stars = createStars(); });
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);
resumeButton.addEventListener('click', togglePause);
soundButton.addEventListener('click', () => {
    soundOn = !soundOn;
    soundButton.textContent = soundOn ? 'Sound on' : 'Sound off';
    if (soundOn) tone(520, .08, 'sine');
});
resizeCanvas();
game = createGame();
game.running = false;
render(0);