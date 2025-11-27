
export enum Team {
  BLUE = 'BLUE', // Player Team
  RED = 'RED',   // Enemy Team
}

export enum EntityType {
  HERO = 'HERO',
  MINION_MELEE = 'MINION_MELEE',
  MINION_RANGED = 'MINION_RANGED',
  TOWER = 'TOWER',
  NEXUS = 'NEXUS',
  PROJECTILE = 'PROJECTILE'
}

export interface Vector2 {
  x: number;
  y: number;
}

export type EffectType = 
  | 'TEXT' 
  | 'GOLD_TEXT'
  | 'SWORD_DROP' 
  | 'EXPLOSION' 
  | 'HIT' 
  | 'PARTICLE' 
  | 'SLASH_WAVE' 
  | 'SHOCKWAVE' 
  | 'CRATER' 
  | 'GOD_RAY'
  | 'RECALL_RAY';

export interface VisualEffect {
  id: string;
  type: EffectType;
  position: Vector2;
  velocity?: Vector2; 
  life: number; 
  maxLife: number;
  text?: string;
  color?: string;
  scale?: number;
  radius?: number;
  rotation?: number;
  rotationSpeed?: number;
  decay?: number; // 0-1 multiplier for shrinking
}

export interface ItemStat {
  damage?: number;
  hp?: number;
  moveSpeed?: number;
  attackSpeed?: number; // percentage 0.1 = 10%
  cooldownReduction?: number; // percentage
  critChance?: number;
}

export interface Item {
  id: string;
  name: string;
  cost: number;
  icon: string;
  stats: ItemStat;
  description: string;
}

export interface Entity {
  id: string;
  type: EntityType;
  team: Team;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  
  // Movement
  moveTarget: Vector2 | null; 
  
  // Base Stats (Unmodified)
  baseStats: {
    hp: number;
    damage: number;
    attackRange: number;
    attackSpeed: number;
    moveSpeed: number;
  };

  // Current Stats (Modified by items)
  hp: number;
  maxHp: number;
  damage: number;
  attackRange: number;
  attackSpeed: number; 
  moveSpeed: number;
  baseMoveSpeed: number; // Used for slow calcs, equals baseStats.moveSpeed + items
  
  // Economy & Items
  gold: number;
  inventory: Item[];

  // Skill State
  cooldowns: { [key: string]: number }; 
  maxCooldowns: { [key: string]: number }; 
  
  qActive: boolean;
  qEndsAt: number;
  
  wActive: boolean;
  wEndsAt: number;
  shield: number;
  
  eActive: boolean;
  eEndsAt: number;
  lastSpinTick: number;

  // AI & Combat State
  targetId: string | null;
  chaseTarget: boolean; 
  lastAttackTime: number; // Used for animation sync
  isDead: boolean;
  respawnTimer: number; 
  aiState: 'IDLE' | 'ATTACK' | 'RETREAT' | 'FARM'; 
  
  // Recall State
  isRecalling: boolean;
  recallTimer: number;

  // Visuals
  color: string;
}

export interface Projectile {
  id: string;
  team: Team;
  position: Vector2;
  velocity: Vector2;
  damage: number;
  targetId: string; 
  speed: number;
  radius: number;
  toDelete: boolean;
}

export interface GameState {
  entities: Entity[];
  projectiles: Projectile[];
  effects: VisualEffect[];
  lastTick: number;
  gameTime: number; 
  lastWaveTime: number;
  gameOver: boolean;
  winner: Team | null;
  cameraX: number;
  cameraShake: number; 
  
  playerId: string;
  mousePos: Vector2; 
}
