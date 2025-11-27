
import { Team, Item } from './types';

export const GAME_WIDTH = 3000;
export const GAME_HEIGHT = 800; // Lane width
export const LANE_Y = GAME_HEIGHT / 2;

// Balancing
export const WAVE_INTERVAL = 25; // Seconds between waves
export const RESPAWN_TIME = 10; // Seconds to respawn
export const RECALL_DURATION = 4.0; // Seconds to recall
export const PASSIVE_GOLD_TICK = 1.0; // Seconds
export const PASSIVE_GOLD_AMOUNT = 3; 

export const SHOP_RANGE = 400; // Range from spawn to buy

export const GOLD_REWARDS = {
  MINION: 45,
  HERO: 300,
  TOWER: 500,
  NEXUS: 0
};

export const ITEMS: Item[] = [
  {
    id: 'long_sword',
    name: 'Long Sword',
    cost: 350,
    icon: 'Sword',
    stats: { damage: 15 },
    description: '+15 Attack Damage'
  },
  {
    id: 'boots',
    name: 'Boots of Speed',
    cost: 300,
    icon: 'Footprints',
    stats: { moveSpeed: 40 },
    description: '+40 Move Speed'
  },
  {
    id: 'ruby_crystal',
    name: 'Ruby Crystal',
    cost: 400,
    icon: 'Heart',
    stats: { hp: 150 },
    description: '+150 Health'
  },
  {
    id: 'dagger',
    name: 'Dagger',
    cost: 300,
    icon: 'Zap',
    stats: { attackSpeed: 0.15 },
    description: '+15% Attack Speed'
  },
  {
    id: 'bf_sword',
    name: 'B.F. Sword',
    cost: 1300,
    icon: 'Sword',
    stats: { damage: 45 },
    description: '+45 Attack Damage'
  },
  {
    id: 'warmogs',
    name: 'Warmog Armor',
    cost: 1000,
    icon: 'Shield',
    stats: { hp: 400 },
    description: '+400 Health'
  },
  {
    id: 'infinity_edge',
    name: 'Infinity Blade',
    cost: 2400,
    icon: 'Star',
    stats: { damage: 70, critChance: 0.2 },
    description: '+70 AD, +20% Crit'
  },
  {
    id: 'phantom_dancer',
    name: 'Phantom Dancer',
    cost: 1800,
    icon: 'Wind',
    stats: { attackSpeed: 0.4, moveSpeed: 30, critChance: 0.1 },
    description: '+40% AS, +30 MS'
  }
];

export const GAREN_SKILLS = {
  Q: { cd: 8, duration: 3.5, speedBuff: 120, bonusDmg: 80 },
  W: { cd: 18, duration: 4, shield: 250 },
  E: { cd: 9, duration: 3, radius: 160, dps: 150 }, 
  R: { cd: 40, range: 400, baseDmg: 300, executePct: 0.35 }
};

export const STATS = {
  HERO: {
    hp: 1200, damage: 75, range: 150, speed: 190, radius: 25, attackSpeed: 1.1
  },
  MINION_MELEE: {
    hp: 450, damage: 15, range: 40, speed: 110, radius: 12, attackSpeed: 0.8
  },
  MINION_RANGED: {
    hp: 300, damage: 25, range: 350, speed: 110, radius: 12, attackSpeed: 0.8
  },
  TOWER: {
    hp: 3000, damage: 150, range: 450, speed: 0, radius: 40, attackSpeed: 0.5
  },
  NEXUS: {
    hp: 5000, damage: 0, range: 0, speed: 0, radius: 60, attackSpeed: 0
  }
};

export const COLORS = {
  [Team.BLUE]: {
    HERO: '#3b82f6', 
    MINION: '#93c5fd', 
    STRUCTURE: '#1e40af', 
  },
  [Team.RED]: {
    HERO: '#ef4444', 
    MINION: '#fca5a5', 
    STRUCTURE: '#991b1b', 
  }
};
