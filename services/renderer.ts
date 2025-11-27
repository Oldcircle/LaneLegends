
import { GameState, Team, EntityType, Entity, Vector2, Projectile, VisualEffect } from '../types';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, LANE_Y, GAREN_SKILLS } from '../constants';

const PALETTE = {
  GROUND: '#232931', 
  GRASS_DARK: '#303841',
  GRASS_LIGHT: '#3a4750',
  ROAD_BASE: '#393e46',
  ROAD_STONES: '#222831',
  
  BLUE_TEAM: { MAIN: '#00adb5', DARK: '#0f4c75', LIGHT: '#a8e6cf', ACCENT: '#f9f7f7' },
  RED_TEAM: { MAIN: '#ff2e63', DARK: '#a71d3a', LIGHT: '#ff9a9e', ACCENT: '#330000' },
  
  GOLD: '#fce38a',
  SHADOW: 'rgba(0,0,0,0.4)',
  HP_GREEN: '#2ecc71',
  HP_RED: '#e74c3c',
  HP_SHIELD: '#ecf0f1'
};

export const renderGame = (ctx: CanvasRenderingContext2D, state: GameState, width: number, height: number) => {
  // Clear
  ctx.fillStyle = PALETTE.GRASS_DARK;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  
  // Camera Shake
  let shakeX = 0;
  let shakeY = 0;
  if (state.cameraShake > 0) {
      shakeX = (Math.random() - 0.5) * state.cameraShake;
      shakeY = (Math.random() - 0.5) * state.cameraShake;
  }
  ctx.translate(-state.cameraX + shakeX, shakeY);

  drawDetailedEnvironment(ctx);

  const sortedEntities = [...state.entities].sort((a, b) => a.position.y - b.position.y);
  
  // Shadows
  sortedEntities.forEach(entity => !entity.isDead && drawUnitShadow(ctx, entity));

  // Ground VFX
  state.effects.filter(e => e.type === 'CRATER' || e.type === 'GOD_RAY').forEach(eff => drawVisualEffect(ctx, eff));

  // Units
  sortedEntities.forEach(entity => {
    if (entity.isDead) return;
    if (entity.eActive) drawSpinEffect(ctx, entity);
    drawEntity(ctx, entity, state.gameTime);
  });

  // Projectiles
  state.projectiles.forEach(proj => drawProjectile(ctx, proj));
  
  // Overlay VFX
  state.effects.filter(e => e.type !== 'CRATER' && e.type !== 'GOD_RAY').forEach(eff => drawVisualEffect(ctx, eff));

  // Bars
  sortedEntities.forEach(entity => !entity.isDead && drawHealthBar(ctx, entity));
  
  // Move Marker
  const player = state.entities.find(e => e.id === state.playerId);
  if (player && player.moveTarget && !player.isDead) drawMoveMarker(ctx, player.moveTarget);
  
  ctx.restore();

  // Vignette
  const grad = ctx.createRadialGradient(width/2, height/2, height/2, width/2, height/2, Math.max(width, height));
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
};

function drawDetailedEnvironment(ctx: CanvasRenderingContext2D) {
  const laneTop = LANE_Y - 200;
  const laneHeight = 400;
  ctx.fillStyle = PALETTE.ROAD_BASE;
  ctx.fillRect(0, laneTop, GAME_WIDTH, laneHeight);
  ctx.fillStyle = PALETTE.ROAD_STONES;
  for(let x = 0; x < GAME_WIDTH; x += 120) {
      for(let y = laneTop; y < laneTop + laneHeight; y += 90) {
          if ((x+y)%7 === 0) {
              ctx.beginPath();
              drawStone(ctx, x + Math.sin(y)*20, y + Math.cos(x)*10, 35, 18);
          }
      }
  }
  ctx.fillStyle = PALETTE.GRASS_LIGHT;
  ctx.beginPath();
  for(let x=0; x<=GAME_WIDTH; x+=40) ctx.arc(x, laneTop, 25, 0, Math.PI, true);
  ctx.fill();
  ctx.beginPath();
  for(let x=0; x<=GAME_WIDTH; x+=40) ctx.arc(x, laneTop + laneHeight, 25, 0, Math.PI, false);
  ctx.fill();
}

function drawStone(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 5);
    ctx.fill();
}

function drawUnitShadow(ctx: CanvasRenderingContext2D, entity: Entity) {
    ctx.save();
    ctx.translate(entity.position.x, entity.position.y);
    ctx.scale(1, 0.4); 
    ctx.fillStyle = PALETTE.SHADOW;
    ctx.beginPath();
    ctx.arc(0, 10, entity.radius * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawEntity(ctx: CanvasRenderingContext2D, entity: Entity, time: number) {
  ctx.save();
  ctx.translate(entity.position.x, entity.position.y);
  
  const isBlue = entity.team === Team.BLUE;
  if (!isBlue) ctx.scale(-1, 1); 

  // Bobbing
  const bob = Math.sin(time * 10) * (entity.velocity.x !== 0 || entity.velocity.y !== 0 ? 3 : 1);
  ctx.translate(0, bob);

  // W Shield
  if (entity.wActive) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#fcd34d';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#fcd34d';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, -15, entity.radius + 8 + Math.sin(time*20)*2, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
  }
  
  // Type specific
  if (entity.type === EntityType.HERO) drawHero(ctx, isBlue, entity, time);
  else if (entity.type === EntityType.MINION_MELEE) drawMeleeMinion(ctx, isBlue, entity, time);
  else if (entity.type === EntityType.MINION_RANGED) drawRangedMinion(ctx, isBlue, entity, time);
  else if (entity.type === EntityType.TOWER) drawTower(ctx, isBlue, entity);
  else if (entity.type === EntityType.NEXUS) drawNexus(ctx, isBlue);

  ctx.restore();
}

// ANIMATION HELPER
function getAttackAnim(entity: Entity, time: number) {
    const timeSince = time - entity.lastAttackTime;
    
    // SAFETY
    if (timeSince < 0 || timeSince > 5.0) return { rot: 0, lunge: 0 };
    
    const duration = 1.0 / entity.attackSpeed;
    if (timeSince < duration) {
        // Phases: 0-0.3 Windup, 0.3-0.5 Swing, 0.5-1.0 Recovery
        const p = timeSince / duration;
        
        // Swing harder/further
        if (p < 0.3) return { rot: -1.2 * (p/0.3), lunge: -8 * (p/0.3) }; // Wind up back
        if (p < 0.5) return { rot: 2.5 * ((p-0.3)/0.2) - 1.2, lunge: 25 * ((p-0.3)/0.2) }; // Power swing
        return { rot: 1.3 - 1.3 * ((p-0.5)/0.5), lunge: 25 * (1 - (p-0.5)/0.5) }; // Recover
    }
    return { rot: 0, lunge: 0 };
}

function drawHero(ctx: CanvasRenderingContext2D, isBlue: boolean, entity: Entity, time: number) {
    const c = isBlue ? PALETTE.BLUE_TEAM : PALETTE.RED_TEAM;
    const anim = getAttackAnim(entity, time);

    // Cape
    ctx.fillStyle = c.DARK;
    ctx.beginPath();
    ctx.moveTo(-10, -20);
    ctx.lineTo(10, -20);
    ctx.lineTo(15 + anim.lunge * 0.5, 15);
    ctx.lineTo(-15 + anim.lunge * 0.2, 15);
    ctx.fill();

    // Body
    ctx.fillStyle = '#94a3b8'; 
    ctx.fillRect(-12 + anim.lunge, -25, 24, 25);
    
    // Shoulders
    ctx.fillStyle = c.MAIN;
    ctx.beginPath();
    ctx.arc(-16 + anim.lunge, -25, 8, 0, Math.PI*2);
    ctx.arc(16 + anim.lunge, -25, 8, 0, Math.PI*2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#facc15'; 
    ctx.beginPath();
    ctx.arc(0 + anim.lunge, -32, 10, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.fillRect(-5 + anim.lunge, -34, 10, 3);

    // Sword Arm
    // HIDE SWORD IF SPINNING
    if (!entity.eActive) {
        ctx.save();
        ctx.translate(10 + anim.lunge, -25); // Shoulder pivot
        ctx.rotate(0.2 + anim.rot);
        
        // Q Glow
        if (entity.qActive) {
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 15;
        }

        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-4, -40, 8, 50); // Blade
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-10, -10, 20, 6); // Guard
        
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

function drawMeleeMinion(ctx: CanvasRenderingContext2D, isBlue: boolean, entity: Entity, time: number) {
    const c = isBlue ? PALETTE.BLUE_TEAM : PALETTE.RED_TEAM;
    const anim = getAttackAnim(entity, time);
    
    // Body
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.arc(0 + anim.lunge, -10, 10, 0, Math.PI*2);
    ctx.fill();
    
    // Helmet
    ctx.fillStyle = c.MAIN;
    ctx.beginPath();
    ctx.arc(0 + anim.lunge, -14, 9, Math.PI, 0);
    ctx.fill();

    // Sword
    ctx.save();
    ctx.translate(8 + anim.lunge, -10);
    ctx.rotate(anim.rot);
    ctx.fillStyle = '#eee';
    ctx.fillRect(-2, -15, 4, 15);
    ctx.restore();
    
    // Shield
    ctx.fillStyle = c.DARK;
    ctx.beginPath();
    ctx.arc(-8 + anim.lunge, -8, 8, 0, Math.PI*2);
    ctx.fill();
}

function drawRangedMinion(ctx: CanvasRenderingContext2D, isBlue: boolean, entity: Entity, time: number) {
    const c = isBlue ? PALETTE.BLUE_TEAM : PALETTE.RED_TEAM;
    const anim = getAttackAnim(entity, time); // Staff swing

    ctx.fillStyle = c.DARK;
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(12, 10);
    ctx.lineTo(-12, 10);
    ctx.fill();

    ctx.fillStyle = c.MAIN;
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.lineTo(10, -20);
    ctx.lineTo(-10, -20);
    ctx.fill();
    
    // Staff
    ctx.save();
    ctx.translate(10, -10);
    ctx.rotate(anim.rot * 0.5); // Less rotation for mage
    ctx.strokeStyle = '#8e44ad'; 
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(5, -20);
    ctx.stroke();
    
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(5, -22, 4, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
}

function drawTower(ctx: CanvasRenderingContext2D, isBlue: boolean, entity: Entity) {
    const c = isBlue ? PALETTE.BLUE_TEAM : PALETTE.RED_TEAM;
    const hpPct = entity.hp / entity.maxHp;

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(-30, 20);
    ctx.lineTo(30, 20);
    ctx.lineTo(25, -60);
    ctx.lineTo(-25, -60);
    ctx.fill();

    const float = Math.sin(Date.now() / 500) * 5;
    ctx.translate(0, float);
    
    ctx.fillStyle = c.MAIN;
    ctx.shadowColor = c.MAIN;
    ctx.shadowBlur = hpPct * 30;
    
    ctx.beginPath();
    ctx.moveTo(0, -90);
    ctx.lineTo(15, -70);
    ctx.lineTo(0, -50);
    ctx.lineTo(-15, -70);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawNexus(ctx: CanvasRenderingContext2D, isBlue: boolean) {
    const c = isBlue ? PALETTE.BLUE_TEAM : PALETTE.RED_TEAM;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(0, 20, 50, 20, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = c.DARK;
    ctx.strokeStyle = c.MAIN;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -100);
    ctx.lineTo(40, -30);
    ctx.lineTo(0, 30);
    ctx.lineTo(-40, -30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

// VFX RENDERING
function drawSpinEffect(ctx: CanvasRenderingContext2D, entity: Entity) {
    ctx.save();
    ctx.translate(entity.position.x, entity.position.y);
    const time = Date.now() / 50; // Faster spin for logic calculation
    
    // Use lighter composition for magical/energy look
    ctx.globalCompositeOperation = 'lighter';

    // 1. The Tornado Base (Motion Blur)
    // We draw multiple transparent layers rotated slightly to create a smear
    const bladeCount = 3;
    const layers = 5;
    
    for (let l = 0; l < layers; l++) {
        ctx.save();
        // Each layer is slightly behind the current rotation
        ctx.rotate(time - l * 0.1); 
        ctx.globalAlpha = (1 - l / layers) * 0.6;
        
        ctx.fillStyle = entity.team === Team.BLUE ? '#3b82f6' : '#ef4444'; // Team color spin
        if (l === 0) ctx.fillStyle = '#fef08a'; // Leading edge is gold

        for(let i=0; i<bladeCount; i++) {
            ctx.rotate((Math.PI * 2) / bladeCount);
            ctx.beginPath();
            // Sword shape
            ctx.moveTo(10, 0);
            ctx.lineTo(entity.radius + 60, -10); // Tip wide
            ctx.lineTo(entity.radius + 50, 20); // Trailing edge
            ctx.lineTo(10, 10);
            ctx.fill();
        }
        ctx.restore();
    }

    // 2. Outer Ring Shockwave
    ctx.rotate(-time * 0.5); // Counter rotate ring
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2 + Math.sin(time) * 1;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(0,0, entity.radius + 40 + Math.random()*5, 0, Math.PI*2);
    ctx.stroke();

    // 3. Inner Dust/Wind
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, entity.radius + 10, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
    const isBlue = proj.team === Team.BLUE;
    const c = isBlue ? PALETTE.BLUE_TEAM : PALETTE.RED_TEAM;
    ctx.save();
    ctx.translate(proj.position.x, proj.position.y);
    ctx.fillStyle = c.LIGHT;
    ctx.shadowColor = c.MAIN;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, proj.radius, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
}

function drawVisualEffect(ctx: CanvasRenderingContext2D, eff: VisualEffect) {
    const pct = eff.life / eff.maxLife; 
    
    ctx.save();
    ctx.translate(eff.position.x, eff.position.y);
    
    if (eff.rotation) ctx.rotate(eff.rotation);

    if (eff.type === 'PARTICLE') {
        const r = (eff.radius || 3) * (eff.decay ? Math.pow(pct, 0.5) : 1);
        ctx.fillStyle = eff.color || '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI*2);
        ctx.fill();
    } 
    else if (eff.type === 'SLASH_WAVE') {
        // Crescent shape
        ctx.globalAlpha = pct;
        ctx.scale(1 + (1-pct)*0.5, 1);
        ctx.fillStyle = '#fde047';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, eff.radius || 50, -Math.PI/3, Math.PI/3);
        ctx.arc(10, 0, (eff.radius || 50) - 10, Math.PI/3, -Math.PI/3, true);
        ctx.fill();
    }
    else if (eff.type === 'SHOCKWAVE') {
        ctx.strokeStyle = eff.color || '#fff';
        ctx.lineWidth = 4 * pct;
        ctx.globalAlpha = pct;
        ctx.beginPath();
        ctx.arc(0, 0, (eff.radius || 20) + (1-pct)*30, 0, Math.PI*2);
        ctx.stroke();
    }
    else if (eff.type === 'GOD_RAY') {
        const w = (eff.scale || 1) * 60 * Math.sin(pct * Math.PI);
        ctx.globalAlpha = pct * 0.8;
        ctx.fillStyle = '#fef3c7';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 30;
        ctx.fillRect(-w/2, -800, w, 800);
    }
    else if (eff.type === 'CRATER') {
        ctx.globalAlpha = pct;
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.ellipse(0, 10, eff.radius || 50, (eff.radius||50)*0.3, 0, 0, Math.PI*2);
        ctx.fill();
        // Cracks
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.globalAlpha = pct * 0.5;
        for(let i=0; i<5; i++) {
            ctx.rotate(Math.PI*2/5);
            ctx.beginPath();
            ctx.moveTo(0,0);
            ctx.lineTo(eff.radius||50, 0);
            ctx.stroke();
        }
    }
    else if (eff.type === 'RECALL_RAY') {
        ctx.globalAlpha = pct * 0.7;
        ctx.fillStyle = eff.color || '#3b82f6';
        ctx.shadowColor = eff.color || '#3b82f6';
        ctx.shadowBlur = 20;
        const w = 30 * pct;
        ctx.fillRect(-w/2, -800, w, 800);
        
        // Ground rings
        ctx.strokeStyle = eff.color || '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 30 * (1-pct), 10 * (1-pct), 0, 0, Math.PI*2);
        ctx.stroke();
    }
    else if (eff.type === 'GOLD_TEXT') {
        const lift = (1-pct) * 80;
        ctx.globalAlpha = pct;
        ctx.font = `bold 24px "Arial Black", sans-serif`;
        ctx.fillStyle = '#facc15'; // Gold
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.fillText(eff.text || '', 10, -50 - lift);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';
        ctx.strokeText(eff.text || '', 10, -50 - lift);
    }
    else if (eff.type === 'TEXT') {
        const lift = (1-pct) * 80;
        ctx.globalAlpha = pct;
        ctx.font = `900 ${20 * (eff.scale||1)}px "Arial Black", sans-serif`;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'black';
        ctx.strokeText(eff.text || '', 0, -50 - lift);
        ctx.fillStyle = eff.color || '#fff';
        ctx.fillText(eff.text || '', 0, -50 - lift);
    }
    else if (eff.type === 'HIT') {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        const s = 15;
        ctx.beginPath(); ctx.moveTo(-s,-s); ctx.lineTo(s,s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s,-s); ctx.lineTo(-s,s); ctx.stroke();
    }
    else if (eff.type === 'EXPLOSION') {
        ctx.globalAlpha = pct;
        ctx.fillStyle = eff.color || '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 50 * (1-pct), 0, Math.PI*2);
        ctx.fill();
    }
    
    ctx.restore();
}

function drawHealthBar(ctx: CanvasRenderingContext2D, entity: Entity) {
    const w = 50;
    const h = 6;
    const x = entity.position.x - w/2;
    const y = entity.position.y - entity.radius - 40;
    
    // Recall Bar
    if (entity.isRecalling) {
        const rw = 60;
        const rx = entity.position.x - rw/2;
        const ry = entity.position.y + 20;
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(rx, ry, rw, 5);
        ctx.fillStyle = '#60a5fa';
        // Timer counts down, so reverse pct
        const rp = 1 - (entity.recallTimer / 4.0); 
        ctx.fillRect(rx, ry, rw * rp, 5);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(rx, ry, rw, 5);
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(x-1, y-1, w+2, h+2);
    
    const pct = Math.max(0, entity.hp / entity.maxHp);
    ctx.fillStyle = entity.team === Team.BLUE ? PALETTE.HP_GREEN : PALETTE.HP_RED;
    ctx.fillRect(x, y, w * pct, h);
    
    if (entity.shield > 0) {
        const spct = Math.min(1, entity.shield / entity.maxHp);
        ctx.fillStyle = PALETTE.HP_SHIELD;
        ctx.fillRect(x, y, w * spct, h/2); 
    }
    ctx.strokeStyle = '#222';
    ctx.strokeRect(x-1, y-1, w+2, h+2);
}

function drawMoveMarker(ctx: CanvasRenderingContext2D, pos: Vector2) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    const scale = 1 + Math.sin(Date.now() / 150) * 0.2;
    ctx.scale(scale, scale);
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(0, 10);
    ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
    ctx.stroke();
    ctx.restore();
}
