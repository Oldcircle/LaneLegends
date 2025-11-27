# Lane Legends / 兵线传说

A lightweight, browser-based single-lane MOBA game built with React, TypeScript, and HTML5 Canvas. It features a simplified "ARAM" style gameplay with a visual aesthetic inspired by *Kingdom Rush*.

这是一个基于浏览器、轻量级的单兵线 MOBA 游戏，使用 React、TypeScript 和 HTML5 Canvas 构建。它具有类似“极地大乱斗”的玩法，并采用了致敬《王国保卫战》的视觉风格。

## 🎮 Game Features / 游戏特性

*   **Classic MOBA Mechanics**: Minion waves, defensive towers, inhibitors (Nexus), and gold economy.
    *   **经典 MOBA 机制**：兵线、防御塔、水晶（基地）以及金币经济系统。
*   **Hero Combat**: Play as a Garen-inspired warrior with a full skill kit (Q/W/E/R).
    *   **英雄战斗**：操控类“盖伦”战士，拥有完整的 Q/W/E/R 技能组。
*   **Smart AI**: The enemy AI knows how to farm, trade damage, combo skills, retreat when low, and recall to base.
    *   **智能 AI**：敌方 AI 懂得打钱、换血、连招、残血撤退以及回城补给。
*   **Item Shop**: Earn gold by killing minions/heroes and buy items to boost stats (AD, HP, Speed, etc.).
    *   **装备商店**：通过击杀小兵或英雄获取金币，购买装备提升属性（攻击力、血量、移速等）。
*   **Visuals**: Custom Canvas renderer featuring dynamic lighting, particle effects, and procedural animations.
    *   **视觉效果**：自定义 Canvas 渲染器，包含动态光照、粒子特效以及程序化动画。

## 🕹️ Controls / 操作说明

| Action | Key / Mouse | Description |
| :--- | :--- | :--- |
| **Move** | **Right Click (Ground)** | Move your hero to the target location.<br>右键点击地面移动。 |
| **Attack** | **Right Click (Enemy)** | Attack a specific enemy unit.<br>右键点击敌人进行攻击。 |
| **Skill Q** | **Q** | **Decisive Strike**: Speed up and deal bonus damage on next hit.<br>**致命打击**：加速并在下次攻击造成额外伤害。 |
| **Skill W** | **W** | **Courage**: Gain a temporary shield.<br>**勇气**：获得一个临时护盾。 |
| **Skill E** | **E** | **Judgment**: Spin around, dealing AoE damage.<br>**审判**：旋转并对周围造成持续范围伤害。 |
| **Ultimate** | **R** | **Demacian Justice**: Execute logic massive damage.<br>**德玛西亚正义**：造成巨额斩杀伤害。 |
| **Recall** | **B** | Channel to return to base and heal.<br>**回城**：吟唱后回到基地并恢复生命值。 |
| **Shop** | **P** | Open/Close the Item Shop (Must be at base).<br>**商店**：打开/关闭装备商店（需在基地范围内）。 |

## 🛠️ Tech Stack / 技术栈

*   **Frontend Framework**: React 18
*   **Language**: TypeScript
*   **Rendering**: HTML5 Canvas API (Custom rendering engine)
*   **Styling**: Tailwind CSS (For HUD and UI overlays)
*   **Icons**: Lucide React

## 📂 Project Structure / 项目结构

*   `services/gameEngine.ts`: The core logic loop (physics, collision, combat, stats).
    *   核心游戏循环（物理、碰撞、战斗、数值）。
*   `services/renderer.ts`: Pure Canvas rendering logic (drawing units, VFX, environment).
    *   纯 Canvas 渲染逻辑（绘制单位、特效、环境）。
*   `components/GameCanvas.tsx`: React wrapper for the canvas and input handling.
    *   Canvas 的 React 包装器及输入处理。
*   `components/HUD.tsx`: The UI layer (Health bars, Skills, Shop, Scoreboard).
    *   UI 层（血条、技能栏、商店、计分板）。
*   `constants.ts`: Game balance configurations (Stats, Item data, Gold values).
    *   游戏平衡配置（属性、物品数据、金币数值）。

## 🚀 How to Run / 如何运行

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Start the development server:
    ```bash
    npm start
    ```

## 🎨 Art Style / 美术风格

The game uses no external image assets. Every visual element—from the characters' waving capes to the swirling tornado effects—is drawn programmatically using the Canvas API's drawing primitives (Paths, Arcs, Gradients).

游戏未使用任何外部图片素材。所有视觉元素——从角色飘动的披风到旋转的龙卷风特效——均通过 Canvas API 的绘图原语（路径、圆弧、渐变）程序化绘制而成。
