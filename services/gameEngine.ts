
import { Entity, EntityType, GameState, Team, Vector2, Item } from '../types';
import { GAME_WIDTH, LANE_Y, STATS, WAVE_INTERVAL, GAREN_SKILLS, RESPAWN_TIME, ITEMS, SHOP_RANGE, GOLD_REWARDS, PASSIVE_GOLD_AMOUNT, PASSIVE_GOLD_TICK, RECALL_DURATION } from '../constants';

const uid = () => Math.random().toString(36).substr(2, 9);
const dist = (a: Vector2, b: Vector2) => Math.hypot(a.x - b.x, a.y - b.y);

export const createInitialState = (): GameState => {
  const blueHero = createEntity(EntityType.HERO, Team.BLUE, { x: 200, y: LANE_Y });
  const redHero = createEntity(EntityType.HERO, Team.RED, { x: GAME_WIDTH - 200, y: LANE_Y });

  return {
    entities: [
      createEntity(EntityType.NEXUS, Team.BLUE, { x: 80, y: LANE_Y }),
      createEntity(EntityType.TOWER, Team.BLUE, { x: 900, y: LANE_Y }),
      blueHero,
      createEntity(EntityType.NEXUS, Team.RED, { x: GAME_WIDTH - 80, y: LANE_Y }),
      createEntity(EntityType.TOWER, Team.RED, { x: GAME_WIDTH - 900, y: LANE_Y }),
      redHero,
    ],
    projectiles: [],
    effects: [],
    lastTick: performance.now(),
    gameTime: 0,
    lastWaveTime: -WAVE_INTERVAL + 5, 
    gameOver: false,
    winner: null,
    cameraX: 0,
    cameraShake: 0,
    playerId: blueHero.id,
    mousePos: { x: 0, y: 0 }
  };
};

function createEntity(type: EntityType, team: Team, position: Vector2): Entity {
  const stats = STATS[type === EntityType.HERO ? 'HERO' : type === EntityType.MINION_MELEE ? 'MINION_MELEE' : type === EntityType.MINION_RANGED ? 'MINION_RANGED' : type === EntityType.TOWER ? 'TOWER' : 'NEXUS'];
  
  return {
    id: uid(),
    type,
    team,
    position: { ...position },
    velocity: { x: 0, y: 0 },
    radius: stats.radius,
    // Current Stats (Init to base)
    hp: stats.hp,
    maxHp: stats.hp,
    damage: stats.damage,
    attackRange: stats.range,
    attackSpeed: stats.attackSpeed,
    moveSpeed: stats.speed,
    baseMoveSpeed: stats.speed,
    
    // Base Stats Storage
    baseStats: {
        hp: stats.hp,
        damage: stats.damage,
        attackRange: stats.range,
        attackSpeed: stats.attackSpeed,
        moveSpeed: stats.speed
    },
    
    // Economy
    gold: type === EntityType.HERO ? 500 : 0, // Starting gold
    inventory: [],

    targetId: null,
    chaseTarget: false,
    moveTarget: null,
    lastAttackTime: -10, 
    isDead: false,
    respawnTimer: 0,
    aiState: 'IDLE',
    color: '#fff',
    cooldowns: { q: 0, w: 0, e: 0, r: 0 },
    maxCooldowns: { 
      q: GAREN_SKILLS.Q.cd, 
      w: GAREN_SKILLS.W.cd, 
      e: GAREN_SKILLS.E.cd, 
      r: GAREN_SKILLS.R.cd 
    },
    qActive: false, qEndsAt: 0,
    wActive: false, wEndsAt: 0, shield: 0,
    eActive: false, eEndsAt: 0, lastSpinTick: 0,
    
    isRecalling: false,
    recallTimer: 0
  };
}

// Recalculates stats based on Base + Items
function recalculateStats(entity: Entity) {
    if (entity.type !== EntityType.HERO) return;

    let bonusHp = 0;
    let bonusDmg = 0;
    let bonusMs = 0;
    let bonusAsPct = 0;
    let bonusCdPct = 0;

    entity.inventory.forEach(item => {
        if (item.stats.hp) bonusHp += item.stats.hp;
        if (item.stats.damage) bonusDmg += item.stats.damage;
        if (item.stats.moveSpeed) bonusMs += item.stats.moveSpeed;
        if (item.stats.attackSpeed) bonusAsPct += item.stats.attackSpeed;
        if (item.stats.cooldownReduction) bonusCdPct += item.stats.cooldownReduction;
    });

    const oldMaxHp = entity.maxHp;
    entity.maxHp = entity.baseStats.hp + bonusHp;
    
    if (entity.maxHp > oldMaxHp) {
        entity.hp += (entity.maxHp - oldMaxHp);
    }

    entity.damage = entity.baseStats.damage + bonusDmg;
    entity.baseMoveSpeed = entity.baseStats.moveSpeed + bonusMs;
    entity.moveSpeed = entity.baseMoveSpeed; // Reset, modified by buffs later
    entity.attackSpeed = entity.baseStats.attackSpeed * (1 + bonusAsPct);
    
    // CDR Calc
    const cdrMult = Math.max(0.6, 1 - bonusCdPct); // Cap at 40%
    entity.maxCooldowns.q = GAREN_SKILLS.Q.cd * cdrMult;
    entity.maxCooldowns.w = GAREN_SKILLS.W.cd * cdrMult;
    entity.maxCooldowns.e = GAREN_SKILLS.E.cd * cdrMult;
    entity.maxCooldowns.r = GAREN_SKILLS.R.cd * cdrMult;
}

export const buyItem = (state: GameState, itemId: string) => {
    const player = state.entities.find(e => e.id === state.playerId);
    if (!player || player.isDead) return;

    // Check Range (Spawn)
    const spawnX = player.team === Team.BLUE ? 0 : GAME_WIDTH;
    if (dist(player.position, { x: spawnX, y: LANE_Y }) > SHOP_RANGE) return;

    // Check Inventory limit
    if (player.inventory.length >= 6) return;

    const item = ITEMS.find(i => i.id === itemId);
    if (!item) return;

    // Check Gold
    if (player.gold >= item.cost) {
        player.gold -= item.cost;
        player.inventory.push(item);
        recalculateStats(player);
        // Play SFX
        state.effects.push({
            id: uid(), type: 'TEXT', text: 'Bought!', position: {...player.position, y: player.position.y - 60}, 
            life: 1, maxLife: 1, color: '#fcd34d'
        });
    }
};

// Updated startRecall to support any entity (AI or Player)
export const startRecall = (state: GameState, entityId?: string) => {
    const id = entityId || state.playerId;
    const entity = state.entities.find(e => e.id === id);
    if (!entity || entity.isDead || entity.isRecalling) return;
    
    entity.isRecalling = true;
    entity.recallTimer = RECALL_DURATION;
    entity.velocity = {x:0, y:0};
    entity.moveTarget = null;
    entity.targetId = null;
    entity.qActive = false; // Cancel skills
    entity.eActive = false;
};

export const castSkill = (state: GameState, skillKey: string, casterId?: string) => {
  const id = casterId || state.playerId;
  const entity = state.entities.find(e => e.id === id);
  if (!entity || entity.isDead || state.gameOver) return;

  // Interrupt recall
  if (entity.isRecalling) {
      entity.isRecalling = false;
      entity.recallTimer = 0;
  }

  const now = state.gameTime;
  if (entity.cooldowns[skillKey] > 0) return;

  switch (skillKey) {
    case 'q':
      entity.cooldowns.q = entity.maxCooldowns.q;
      entity.qActive = true;
      entity.qEndsAt = now + GAREN_SKILLS.Q.duration;
      // SFX
      state.effects.push({
          id: uid(), type: 'SHOCKWAVE', position: { ...entity.position }, life: 0.4, maxLife: 0.4, 
          color: '#fde047', radius: 10, scale: 1
      });
      break;
      
    case 'w':
      entity.cooldowns.w = entity.maxCooldowns.w;
      entity.wActive = true;
      entity.wEndsAt = now + GAREN_SKILLS.W.duration;
      entity.shield = GAREN_SKILLS.W.shield;
      break;
      
    case 'e':
      if (entity.eActive) {
        entity.eActive = false;
        entity.cooldowns.e = entity.maxCooldowns.e; 
      } else {
        entity.cooldowns.e = entity.maxCooldowns.e;
        entity.eActive = true;
        entity.eEndsAt = now + GAREN_SKILLS.E.duration;
        entity.lastSpinTick = now;
      }
      break;
      
    case 'r':
      if (entity.targetId) {
        const target = state.entities.find(e => e.id === entity.targetId);
        if (target && !target.isDead && dist(entity.position, target.position) <= GAREN_SKILLS.R.range + 50) {
           entity.cooldowns.r = entity.maxCooldowns.r;
           entity.lastAttackTime = now; // Trigger animation
           
           const missingHp = target.maxHp - target.hp;
           const dmg = GAREN_SKILLS.R.baseDmg + (missingHp * GAREN_SKILLS.R.executePct);
           
           // Delayed damage for visual impact
           setTimeout(() => {
                if(!state.gameOver && !target.isDead) {
                    applyDamage(target, dmg, state, entity, 'ULT');
                }
           }, 400);

           // VISUALS
           state.cameraShake = 20; // Massive shake
           state.effects.push({
             id: uid(), type: 'GOD_RAY', position: { ...target.position }, life: 1.2, maxLife: 1.2, scale: 3
           });
           state.effects.push({
             id: uid(), type: 'CRATER', position: { ...target.position }, life: 3.0, maxLife: 3.0, radius: 80
           });
           spawnParticles(state, target.position, '#fbbf24', 20, 300);
        }
      }
      break;
  }
};

function spawnParticles(state: GameState, pos: Vector2, color: string, count: number, speedVal: number = 100) {
    for(let i=0; i<count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * speedVal + 50;
        state.effects.push({
            id: uid(),
            type: 'PARTICLE',
            position: { ...pos },
            velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed - 100 }, // upward bias
            life: 0.5 + Math.random() * 0.5,
            maxLife: 1.0,
            color: color,
            radius: Math.random() * 3 + 1,
            decay: 0.95
        });
    }
}

function applyDamage(target: Entity, amount: number, state: GameState, dealer?: Entity | null, damageType: 'NORMAL' | 'CRIT' | 'ULT' = 'NORMAL') {
  
  // Break Recall
  if (target.isRecalling) {
      target.isRecalling = false;
      target.recallTimer = 0;
      state.effects.push({id:uid(), type:'TEXT', text:'INTERRUPTED!', position:{...target.position, y: target.position.y - 80}, life:1, maxLife:1, color:'#f00'});
  }

  let damageLeft = amount;
  
  if (target.shield > 0) {
    if (target.shield >= damageLeft) {
      target.shield -= damageLeft;
      damageLeft = 0;
      spawnParticles(state, target.position, '#fff', 3);
    } else {
      damageLeft -= target.shield;
      target.shield = 0;
    }
  }
  
  if (damageLeft > 0) {
    target.hp -= damageLeft;
    // Blood/Sparks
    const color = target.type === EntityType.TOWER || target.type === EntityType.NEXUS ? '#94a3b8' : '#e11d48';
    spawnParticles(state, target.position, color, damageType === 'ULT' ? 20 : 5);
    
    // Floating Text
    state.effects.push({
        id: uid(), type: 'TEXT', text: Math.floor(amount).toString(), 
        position: { x: target.position.x, y: target.position.y - 40 }, 
        life: 0.8, maxLife: 0.8, 
        color: damageType === 'ULT' ? '#fbbf24' : damageType === 'CRIT' ? '#fff' : '#ef4444',
        scale: damageType === 'ULT' ? 2 : 1
    });

    // Death Logic
    if (target.hp <= 0 && !target.isDead) {
        target.isDead = true;
        target.hp = 0;
        if (target.type === EntityType.HERO) target.respawnTimer = RESPAWN_TIME;
        
        // Gold Reward
        if (dealer && dealer.type === EntityType.HERO) {
            let gold = 0;
            if (target.type === EntityType.HERO) gold = GOLD_REWARDS.HERO;
            else if (target.type.includes('MINION')) gold = GOLD_REWARDS.MINION;
            else if (target.type === EntityType.TOWER) gold = GOLD_REWARDS.TOWER;
            
            if (gold > 0) {
                dealer.gold += gold;
                state.effects.push({
                    id: uid(), type: 'GOLD_TEXT', text: `+${gold}g`, 
                    position: { x: target.position.x, y: target.position.y - 60 }, 
                    life: 1.5, maxLife: 1.5, color: '#fcd34d'
                });
            }
        }
        
        spawnParticles(state, target.position, '#555', 10);
        if (target.type === EntityType.NEXUS) {
            state.gameOver = true;
            state.winner = target.team === Team.BLUE ? Team.RED : Team.BLUE;
        }
    }
  }
}

// AI LOGIC
function updateAI(entity: Entity, state: GameState) {
    if (entity.team === Team.BLUE) return; // Only AI for RED

    // If already recalling, do nothing (wait for recall to finish)
    if (entity.isRecalling) return;

    const ownTower = state.entities.find(e => e.type === EntityType.TOWER && e.team === Team.RED && !e.isDead);
    const enemyHero = state.entities.find(e => e.type === EntityType.HERO && e.team === Team.BLUE && !e.isDead);

    // 1. Survival Check
    if (entity.hp < entity.maxHp * 0.3 && ownTower) {
        // If we are already safe under tower, RECALL!
        if (dist(entity.position, ownTower.position) < 250) {
            startRecall(state, entity.id);
            return;
        }

        // Otherwise, run to tower
        entity.aiState = 'RETREAT';
        entity.moveTarget = { x: ownTower.position.x, y: LANE_Y };
        entity.targetId = null;
        
        // Use W/Q to run
        if (entity.cooldowns.w <= 0) castSkill(state, 'w', entity.id);
        if (entity.cooldowns.q <= 0) castSkill(state, 'q', entity.id);
        
        return;
    }

    // 2. Aggression / Combo
    if (enemyHero) {
        const d = dist(entity.position, enemyHero.position);
        
        // Execute?
        if (enemyHero.hp < 400 && entity.cooldowns.r <= 0 && d < GAREN_SKILLS.R.range) {
            entity.targetId = enemyHero.id;
            castSkill(state, 'r', entity.id);
            return;
        }

        // Engage Combo
        if (d < 500 && entity.cooldowns.q <= 0 && entity.hp > entity.maxHp * 0.5) {
            entity.aiState = 'ATTACK';
            castSkill(state, 'q', entity.id);
            entity.targetId = enemyHero.id;
        }
        
        // Spin if close
        if (d < 200 && entity.cooldowns.e <= 0 && !entity.eActive) {
            castSkill(state, 'e', entity.id);
        }
    }

    // 3. Default Behavior (Farm/Lane)
    entity.aiState = 'FARM';
}

let passiveGoldTimer = 0;

export const updateGame = (state: GameState, now: number): GameState => {
  if (state.gameOver) return state;

  const dt = (now - state.lastTick) / 1000; 
  state.lastTick = now;
  state.gameTime += dt;
  
  if (state.cameraShake > 0) state.cameraShake = Math.max(0, state.cameraShake - dt * 60);

  // Passive Gold
  passiveGoldTimer += dt;
  if (passiveGoldTimer >= PASSIVE_GOLD_TICK) {
      passiveGoldTimer = 0;
      state.entities.forEach(e => {
          if (e.type === EntityType.HERO && !e.isDead) e.gold += PASSIVE_GOLD_AMOUNT;
      });
  }

  // Spawning
  if (state.gameTime - state.lastWaveTime >= WAVE_INTERVAL) {
    state.lastWaveTime = state.gameTime;
    spawnWave(state);
  }

  // Update Entities
  state.entities.forEach(entity => {
    // Respawn
    if (entity.isDead) {
        if (entity.type === EntityType.HERO) {
            entity.respawnTimer -= dt;
            if (entity.respawnTimer <= 0) {
                entity.isDead = false;
                entity.hp = entity.maxHp;
                entity.position = entity.team === Team.BLUE ? { x: 200, y: LANE_Y } : { x: GAME_WIDTH - 200, y: LANE_Y };
                state.effects.push({ id: uid(), type: 'EXPLOSION', position: {...entity.position}, life: 1, maxLife: 1, color: '#60a5fa' });
            }
        }
        return; 
    }

    // Recalculate Stats continuously
    let currentSpeed = entity.baseMoveSpeed;
    if (entity.qActive) currentSpeed += GAREN_SKILLS.Q.speedBuff;
    entity.moveSpeed = currentSpeed;

    // Recall Logic
    if (entity.isRecalling) {
        entity.recallTimer -= dt;
        
        // Visual Effect for recall
        if (Math.random() < 0.2) {
             state.effects.push({
                 id:uid(), type:'RECALL_RAY', position:{...entity.position}, life:0.5, maxLife:0.5, color: entity.team===Team.BLUE ? '#3b82f6' : '#ef4444'
             });
        }

        if (entity.recallTimer <= 0) {
            // Recall Complete
            entity.isRecalling = false;
            entity.position = entity.team === Team.BLUE ? { x: 200, y: LANE_Y } : { x: GAME_WIDTH - 200, y: LANE_Y };
            entity.hp = entity.maxHp; // Heal at base
            state.effects.push({ id: uid(), type: 'EXPLOSION', position: {...entity.position}, life: 1, maxLife: 1, color: '#fff' });
            entity.moveTarget = null;
            entity.velocity = {x:0,y:0};
        }
        // Skip movement processing if recalling
        return;
    }

    // Cooldowns
    ['q', 'w', 'e', 'r'].forEach(k => {
      if (entity.cooldowns[k] > 0) entity.cooldowns[k] = Math.max(0, entity.cooldowns[k] - dt);
    });
    if (entity.qActive && state.gameTime > entity.qEndsAt) entity.qActive = false;
    if (entity.wActive && state.gameTime > entity.wEndsAt) { entity.wActive = false; entity.shield = 0; }
    if (entity.eActive && state.gameTime > entity.eEndsAt) entity.eActive = false;
    
    
    // AI Decision Tick
    if (entity.type === EntityType.HERO && entity.team === Team.RED) {
        updateAI(entity, state);
    }

    // Spin Damage
    if (entity.eActive) {
      const tickRate = 0.25;
      if (state.gameTime - entity.lastSpinTick >= tickRate) {
        entity.lastSpinTick = state.gameTime;
        const tickDmg = (GAREN_SKILLS.E.dps * tickRate);
        let hit = false;
        state.entities.forEach(other => {
           if (other.team !== entity.team && !other.isDead) {
             if (dist(entity.position, other.position) <= GAREN_SKILLS.E.radius) {
               applyDamage(other, tickDmg, state, entity);
               hit = true;
             }
           }
        });
        if (hit) {
             state.cameraShake = Math.max(state.cameraShake, 2); 
        }
      }
      
      // Continuous Dust Effect while spinning
      if (Math.random() < 0.6) {
         const a = Math.random() * 6.28;
         const r = GAREN_SKILLS.E.radius * (0.2 + Math.random() * 0.8);
         state.effects.push({
             id: uid(), type: 'PARTICLE', 
             position: { x: entity.position.x + Math.cos(a)*r, y: entity.position.y + Math.sin(a)*r },
             life: 0.3, maxLife: 0.3, color: '#a8a29e', radius: 3, velocity: {x:0, y:-30}
         });
      }
    }

    // Movement
    let moving = false;
    // Interrupt recall if moving manually
    if (entity.moveTarget && entity.isRecalling) {
        entity.isRecalling = false;
    }

    if (entity.moveTarget) {
       const dx = entity.moveTarget.x - entity.position.x;
       const dy = entity.moveTarget.y - entity.position.y;
       const d = Math.hypot(dx, dy);
       if (d < 5) {
           entity.position.x = entity.moveTarget.x;
           entity.position.y = entity.moveTarget.y;
           entity.velocity = {x:0, y:0};
           entity.moveTarget = null;
       } else {
           entity.velocity.x = (dx / d) * entity.moveSpeed;
           entity.velocity.y = (dy / d) * entity.moveSpeed;
           moving = true;
       }
    }

    // Auto-Targeting & Cleanup
    if (entity.targetId) {
      const target = state.entities.find(e => e.id === entity.targetId);
      if (!target || target.isDead || dist(entity.position, target.position) > entity.attackRange * 2.0) {
        if (!entity.chaseTarget) entity.targetId = null;
      }
    }
    
    // Basic AI Acquire
    if (!entity.targetId && entity.type !== EntityType.NEXUS && entity.aiState !== 'RETREAT') {
      const isPlayer = entity.id === state.playerId;
      if (!isPlayer) {
          let bestTarget: Entity | null = null;
          let minDistance = Infinity;
          const searchRange = entity.type === EntityType.TOWER ? 600 : 350;
          state.entities.forEach(other => {
            if (other.team !== entity.team && !other.isDead) {
              const d = dist(entity.position, other.position);
              if (d <= searchRange && d < minDistance) {
                minDistance = d;
                bestTarget = other;
              }
            }
          });
          if (bestTarget) entity.targetId = (bestTarget as Entity).id;
      }
    }

    // Lane Marching (Fallback)
    if (!moving && !entity.targetId && entity.aiState !== 'RETREAT') {
        if (entity.type !== EntityType.TOWER && entity.type !== EntityType.NEXUS && entity.id !== state.playerId) {
            const targetX = entity.team === Team.BLUE ? GAME_WIDTH : 0;
            const dx = targetX - entity.position.x;
            const dy = LANE_Y - entity.position.y;
            const len = Math.hypot(dx, dy);
            if (len > 0) {
                entity.velocity.x = (dx / len) * entity.moveSpeed * (entity.type === EntityType.HERO ? 0.5 : 1);
                entity.velocity.y = (dy / len) * entity.moveSpeed * 0.1;
            }
        }
    }

    // Combat
    if (entity.targetId) {
      const target = state.entities.find(e => e.id === entity.targetId);
      if (target) {
        const d = dist(entity.position, target.position);
        const range = entity.eActive ? entity.radius : entity.attackRange;
        
        if (d > range) {
          // Chase if allowed
          if (!entity.chaseTarget && entity.id === state.playerId) {
              entity.targetId = null; // Player stops auto-attacking if out of range
          } else {
              entity.moveTarget = null; 
              const dx = target.position.x - entity.position.x;
              const dy = target.position.y - entity.position.y;
              const len = Math.hypot(dx, dy);
              entity.velocity.x = (dx / len) * entity.moveSpeed;
              entity.velocity.y = (dy / len) * entity.moveSpeed;
          }
        } else {
          // Attack
          entity.velocity = {x:0, y:0};
          entity.moveTarget = null;
          
          // ATTACK LOGIC: Use SECONDS for timing (1.0 / speed)
          if (!entity.eActive && state.gameTime - entity.lastAttackTime > (1.0 / entity.attackSpeed)) {
            entity.lastAttackTime = state.gameTime;
            
            let finalDamage = entity.damage;
            let isCrit = false;
            
            // Q Proc
            if (entity.qActive) {
                finalDamage += GAREN_SKILLS.Q.bonusDmg;
                entity.qActive = false; 
                isCrit = true;
                state.cameraShake = 5;
                state.effects.push({
                    id: uid(), type: 'SLASH_WAVE', position: { ...target.position }, 
                    rotation: Math.atan2(target.position.y - entity.position.y, target.position.x - entity.position.x),
                    life: 0.3, maxLife: 0.3, radius: 60
                });
            }

            if (entity.attackRange < 200) {
               // Melee Delay (sync with animation swing)
               setTimeout(() => {
                   if (!target.isDead && !state.gameOver) {
                       applyDamage(target, finalDamage, state, entity, isCrit ? 'CRIT' : 'NORMAL');
                       state.effects.push({
                           id: uid(), type: 'HIT', position: { ...target.position }, life: 0.2, maxLife: 0.2
                       });
                   }
               }, 200); // Hit occurs 200ms into animation
            } else {
               // Ranged
               state.projectiles.push({
                 id: uid(), team: entity.team, position: { ...entity.position }, velocity: { x: 0, y: 0 },
                 damage: finalDamage, targetId: target.id, speed: 500, radius: 5, toDelete: false
               });
            }
          }
        }
      }
    }
  });

  // Physics & Collision
  state.entities.forEach(entity => {
    if (entity.isDead || entity.type === EntityType.TOWER || entity.type === EntityType.NEXUS) return;
    if (entity.isRecalling) return; // Recalling units are stationary

    entity.position.x += entity.velocity.x * dt;
    entity.position.y += entity.velocity.y * dt;
    
    // Bounds
    entity.position.y = Math.max(LANE_Y - 140, Math.min(LANE_Y + 140, entity.position.y));
    entity.position.x = Math.max(0, Math.min(GAME_WIDTH, entity.position.x));
    
    // Separation
    state.entities.forEach(other => {
        if (entity !== other && !other.isDead && Math.abs(entity.position.x - other.position.x) < 40) {
           const d = dist(entity.position, other.position);
           const minDist = entity.radius + other.radius;
           if (d < minDist && d > 0) {
              const pushX = (entity.position.x - other.position.x) / d;
              const pushY = (entity.position.y - other.position.y) / d;
              entity.position.x += pushX * 1.5; 
              entity.position.y += pushY * 1.5;
           }
        }
    });
  });

  // Projectiles
  state.projectiles.forEach(p => {
    const target = state.entities.find(e => e.id === p.targetId);
    if (!target || target.isDead) { p.toDelete = true; return; }
    const dx = target.position.x - p.position.x;
    const dy = target.position.y - p.position.y;
    const distToTarget = Math.hypot(dx, dy);
    if (distToTarget < target.radius + p.speed * dt) {
      applyDamage(target, p.damage, state, null); // Proj damage usually no dealer ref tracked here simply
      p.toDelete = true;
    } else {
      p.position.x += (dx / distToTarget) * p.speed * dt;
      p.position.y += (dy / distToTarget) * p.speed * dt;
    }
  });
  state.projectiles = state.projectiles.filter(p => !p.toDelete);
  
  // Effects Update
  state.effects.forEach(eff => {
      eff.life -= dt;
      if (eff.velocity) {
          eff.position.x += eff.velocity.x * dt;
          eff.position.y += eff.velocity.y * dt;
          if (eff.type === 'PARTICLE') eff.velocity.y += 300 * dt; // Gravity
          if (eff.type === 'PARTICLE' && eff.position.y > LANE_Y + 50) {
              eff.velocity.y *= -0.5; // Bounce
              eff.velocity.x *= 0.8;
          }
      }
      
      // Float text up
      if (eff.type === 'GOLD_TEXT' || eff.type === 'TEXT') {
          eff.position.y -= 40 * dt;
      }
  });
  state.effects = state.effects.filter(eff => eff.life > 0);
  
  // Camera smooth follow
  const player = state.entities.find(e => e.id === state.playerId);
  if (player) {
      const targetCamX = player.position.x - window.innerWidth / 2;
      state.cameraX += (targetCamX - state.cameraX) * 0.1;
      state.cameraX = Math.max(0, Math.min(GAME_WIDTH - window.innerWidth, state.cameraX));
  }

  return state;
};

function spawnWave(state: GameState) {
  const spawnOffset = 30;
  for (let i = 0; i < 3; i++) {
    state.entities.push(
      createEntity(EntityType.MINION_MELEE, Team.BLUE, { x: 150 - i * spawnOffset, y: LANE_Y + (Math.random() - 0.5) * 60 }),
      createEntity(EntityType.MINION_MELEE, Team.RED, { x: GAME_WIDTH - 150 + i * spawnOffset, y: LANE_Y + (Math.random() - 0.5) * 60 })
    );
  }
  for (let i = 0; i < 3; i++) {
    state.entities.push(
      createEntity(EntityType.MINION_RANGED, Team.BLUE, { x: 50 - i * spawnOffset, y: LANE_Y + (Math.random() - 0.5) * 60 }),
      createEntity(EntityType.MINION_RANGED, Team.RED, { x: GAME_WIDTH - 50 + i * spawnOffset, y: LANE_Y + (Math.random() - 0.5) * 60 })
    );
  }
}
