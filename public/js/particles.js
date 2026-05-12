// ─────────────────────────────────────────────
//  MORTIS — Atmospheric Particle System
//  Floating dust motes / ember particles
// ─────────────────────────────────────────────

(function () {
  const canvas = document.getElementById('particles-canvas');
  const ctx = canvas.getContext('2d');

  let particles = [];
  let animFrame;
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() { this.reset(true); }

    reset(initial = false) {
      this.x = Math.random() * W;
      this.y = initial ? Math.random() * H : H + 10;
      this.size = Math.random() * 1.8 + 0.3;
      this.speedY = -(Math.random() * 0.4 + 0.1);
      this.speedX = (Math.random() - 0.5) * 0.25;
      this.opacity = 0;
      this.maxOpacity = Math.random() * 0.35 + 0.05;
      this.fadeSpeed = Math.random() * 0.003 + 0.001;
      this.life = 'fadein'; // fadein | alive | fadeout
      this.wobble = Math.random() * Math.PI * 2;
      this.wobbleSpeed = Math.random() * 0.008 + 0.003;
      this.wobbleAmp = Math.random() * 0.4 + 0.1;
    }

    update() {
      this.wobble += this.wobbleSpeed;
      this.x += this.speedX + Math.sin(this.wobble) * this.wobbleAmp;
      this.y += this.speedY;

      if (this.life === 'fadein') {
        this.opacity += this.fadeSpeed;
        if (this.opacity >= this.maxOpacity) {
          this.opacity = this.maxOpacity;
          this.life = 'alive';
        }
      }

      if (this.life === 'alive' && this.y < H * 0.15) {
        this.life = 'fadeout';
      }

      if (this.life === 'fadeout') {
        this.opacity -= this.fadeSpeed * 1.5;
        if (this.opacity <= 0) {
          this.reset(false);
        }
      }

      // Wrap horizontally
      if (this.x < -5) this.x = W + 5;
      if (this.x > W + 5) this.x = -5;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.opacity);
      // Warm golden/amber tone for particles
      ctx.fillStyle = `rgba(200, 175, 120, 1)`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function init() {
    resize();
    particles = [];
    const count = Math.min(Math.floor((W * H) / 14000), 80);
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    animFrame = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => {
    resize();
    // Respawn particles proportionally
    const count = Math.min(Math.floor((W * H) / 14000), 80);
    while (particles.length < count) particles.push(new Particle());
    while (particles.length > count) particles.pop();
  });

  init();
  loop();
})();
