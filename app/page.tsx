'use client'

import Image from "next/image";
import { useRef, useEffect, useState } from "react";

class Entity {
  x: number;
  y: number;
  size: number;
  direction: number;
  velocity: number;
  color: string;
  trail: {x: number, y: number, alpha: number}[];

  constructor(x: number, y: number, size: number, direction: number, velocity: number, color: string) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.direction = direction;
    this.velocity = velocity;
    this.color = color;
    this.trail = [];
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Dessiner la traînée d'eau
    this.drawTrail(ctx);

    // Dessiner le poisson
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.direction * Math.PI) / 180);
    
    // Corps du poisson (ovale)
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size * 0.8, this.size * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Queue du poisson
    ctx.beginPath();
    ctx.moveTo(-this.size * 0.8, 0);
    ctx.lineTo(-this.size * 1.3, -this.size * 0.3);
    ctx.lineTo(-this.size * 1.3, this.size * 0.3);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.stroke();
    
    // Œil du poisson
    ctx.beginPath();
    ctx.arc(this.size * 0.2, -this.size * 0.1, this.size * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.size * 0.25, -this.size * 0.1, this.size * 0.05, 0, Math.PI * 2);
    ctx.fillStyle = "black";
    ctx.fill();
    
    ctx.restore();
  }

  drawTrail(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (let i = 0; i < this.trail.length; i++) {
      const point = this.trail[i];
      ctx.beginPath();
      // Traînée encore plus fine
      const trailSize = (this.trail.length - i) * 0.15;
      ctx.arc(point.x, point.y, trailSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(173, 216, 230, ${point.alpha * 0.2})`;
      ctx.fill();
    }
    ctx.restore();
  }

  updateTrail() {
    // Ajouter la position actuelle à la traînée
    this.trail.push({
      x: this.x,
      y: this.y,
      alpha: 1.0
    });

    // Traînée encore plus longue (40 au lieu de 25)
    if (this.trail.length > 40) {
      this.trail.shift();
    }

    // Diminuer l'alpha encore plus lentement pour une traînée très persistante
    this.trail.forEach(point => {
      point.alpha *= 0.98; // Encore plus lent (0.98 au lieu de 0.97)
    });
  }

  static applySeparation(entities: Entity[], separationDistance: number, canvasWidth: number, canvasHeight: number) {
    for (let i = 0; i < entities.length; i++) {
      let moveX = 0;
      let moveY = 0;
      let count = 0;
      const e1 = entities[i];

      // Séparation - calcul correct des forces de répulsion
      for (let j = 0; j < entities.length; j++) {
        if (i === j) continue;
        const e2 = entities[j];
        const dx = e1.x - e2.x;
        const dy = e1.y - e2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0 && dist < separationDistance) {
          // Force inversement proportionnelle à la distance (plus forte quand plus proche)
          const normalizedDist = dist / separationDistance;
          const force = (1 - normalizedDist) * 2; // Force de 0 à 2
          moveX += (dx / dist) * force;
          moveY += (dy / dist) * force;
          count++;
        }
      }

      if (count > 0) {
        // Moyenne des forces et conversion en angle
        moveX /= count;
        moveY /= count;
        const targetAngle = Math.atan2(moveY, moveX) * 180 / Math.PI;
        
        // Rotation vers l'angle cible (plus réactive)
        let diff = targetAngle - e1.direction;
        // Normaliser la différence d'angle entre -180 et 180
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        
        e1.direction += diff * 0.15; // Plus réactif pour la séparation
      }
    }
  }

  static applyCohesion(entities: Entity[], cohesionDistance: number) {
    for (let i = 0; i < entities.length; i++) {
      let centerX = 0;
      let centerY = 0;
      let count = 0;
      const e1 = entities[i];

      // Trouver le centre de masse des voisins
      for (let j = 0; j < entities.length; j++) {
        if (i === j) continue;
        const e2 = entities[j];
        const dx = e2.x - e1.x;
        const dy = e2.y - e1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0 && dist < cohesionDistance) {
          // Poids inversement proportionnel à la distance (plus proche = plus d'influence)
          const weight = 1 - (dist / cohesionDistance);
          centerX += e2.x * weight;
          centerY += e2.y * weight;
          count += weight;
        }
      }

      if (count > 0) {
        centerX /= count;
        centerY /= count;
        
        // Calculer l'angle vers le centre de masse
        const targetAngle = Math.atan2(centerY - e1.y, centerX - e1.x) * 180 / Math.PI;
        
        let diff = targetAngle - e1.direction;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        
        // Force de cohésion plus forte et variable selon la distance
        const distanceToCenter = Math.sqrt((centerX - e1.x) ** 2 + (centerY - e1.y) ** 2);
        const cohesionStrength = Math.min(0.08, distanceToCenter / cohesionDistance * 0.1);
        e1.direction += diff * cohesionStrength;
      }
    }
  }

  static applyAlignment(entities: Entity[], alignmentDistance: number) {
    for (let i = 0; i < entities.length; i++) {
      let avgDirection = 0;
      let count = 0;
      const e1 = entities[i];

      // Calculer la direction moyenne des voisins
      for (let j = 0; j < entities.length; j++) {
        if (i === j) continue;
        const e2 = entities[j];
        const dx = e2.x - e1.x;
        const dy = e2.y - e1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0 && dist < alignmentDistance) {
          // Poids inversement proportionnel à la distance
          const weight = 1 - (dist / alignmentDistance);
          avgDirection += e2.direction * weight;
          count += weight;
        }
      }

      if (count > 0) {
        avgDirection /= count;
        
        // Alignement plus fort
        let diff = avgDirection - e1.direction;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        
        e1.direction += diff * 0.08; // Plus visible pour l'alignement
      }
    }
  }

  static applyEdgeAvoidance(entities: Entity[], canvasWidth: number, canvasHeight: number) {
    const margin = 150; // Distance du bord pour commencer à tourner
    
    for (const entity of entities) {
      let steerX = 0;
      let steerY = 0;
      
      // Éviter les bords
      if (entity.x < margin) {
        steerX = margin - entity.x;
      } else if (entity.x > canvasWidth - margin) {
        steerX = (canvasWidth - margin) - entity.x;
      }
      
      if (entity.y < margin) {
        steerY = margin - entity.y;
      } else if (entity.y > canvasHeight - margin) {
        steerY = (canvasHeight - margin) - entity.y;
      }
      
      if (steerX !== 0 || steerY !== 0) {
        const targetAngle = Math.atan2(steerY, steerX) * 180 / Math.PI;
        let diff = targetAngle - entity.direction;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        
        entity.direction += diff * 0.03; // Force d'évitement des bords
      }
    }
  }

  nextFrame(deltaTime: number, entities: Entity[], canvasWidth: number, canvasHeight: number) {
    const separationDistance = 30;
    const cohesionDistance = 80;
    const alignmentDistance = 50;

    // Application des règles (seulement une fois par frame)
    // Ces méthodes statiques sont appelées sur tous les boids en même temps
    
    // Conversion de l'angle en radians pour le mouvement
    const rad = (this.direction * Math.PI) / 180;
    this.x += Math.cos(rad) * this.velocity * deltaTime;
    this.y += Math.sin(rad) * this.velocity * deltaTime;

    // Mettre à jour la traînée
    this.updateTrail();

    const halfSize = this.size / 2;

    // Wrap edges
    if (this.x < -halfSize) this.x = canvasWidth + halfSize;
    if (this.x > canvasWidth + halfSize) this.x = -halfSize;
    if (this.y < -halfSize) this.y = canvasHeight + halfSize;
    if (this.y > canvasHeight + halfSize) this.y = -halfSize;

    // Petit mouvement aléatoire pour plus de naturel
    this.direction += (Math.random() - 0.5) * 1;
  }
}

class Bubble {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 8 + 2;
    this.speed = Math.random() * 30 + 10;
    this.alpha = Math.random() * 0.6 + 0.2;
  }

  update(deltaTime: number, canvasHeight: number) {
    this.y -= this.speed * deltaTime;
    this.x += Math.sin(this.y * 0.01) * 0.5; // Mouvement ondulé

    // Si la bulle sort de l'écran, la remettre en bas
    if (this.y < -this.size) {
      this.y = canvasHeight + this.size;
      this.x = Math.random() * window.innerWidth;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    
    // Bulle principale
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(173, 216, 230, 0.3)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Reflet sur la bulle
    ctx.beginPath();
    ctx.arc(this.x - this.size * 0.3, this.y - this.size * 0.3, this.size * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fill();
    
    ctx.restore();
  }
}

function createBubbles(count: number, canvasWidth: number, canvasHeight: number): Bubble[] {
  const bubbles: Bubble[] = [];
  for (let i = 0; i < count; i++) {
    bubbles.push(new Bubble(
      Math.random() * canvasWidth,
      Math.random() * canvasHeight
    ));
  }
  return bubbles;
}

function createEntities(n: number, canvasWidth: number, canvasHeight: number) {
  const entities: Entity[] = [];
  const fishColors = [
    "#FFD700", // Doré
    "#FF6B35", // Orange corail
    "#4ECDC4", // Turquoise
    "#45B7D1", // Bleu clair
    "#96CEB4", // Vert menthe
    "#FFEAA7", // Jaune clair
    "#FF7675"  // Rose corail
  ];

  for (let i = 0; i < n; i++) {
    const x = Math.random() * canvasWidth;
    const y = Math.random() * canvasHeight;
    const direction = Math.random() * 360;
    const color = fishColors[Math.floor(Math.random() * fishColors.length)];

    entities.push(new Entity(x, y, 12, direction, 80, color));
  }

  return entities;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const entitiesRef = useRef<Entity[]>([]);
  const bubblesRef = useRef<Bubble[]>([]);
  
  // Refs pour les paramètres en temps réel
  const separationDistanceRef = useRef(30);
  const cohesionDistanceRef = useRef(100);
  const alignmentDistanceRef = useRef(50);
  const fishSpeedRef = useRef(80);
  
  // États pour les paramètres
  const [fishCount, setFishCount] = useState(50);
  const [separationDistance, setSeparationDistance] = useState(30);
  const [cohesionDistance, setCohesionDistance] = useState(100);
  const [alignmentDistance, setAlignmentDistance] = useState(50);
  const [fishSpeed, setFishSpeed] = useState(80);
  const [bubbleCount, setBubbleCount] = useState(25);
  const [showControls, setShowControls] = useState(false);

  // Mettre à jour les refs quand les états changent
  useEffect(() => {
    separationDistanceRef.current = separationDistance;
  }, [separationDistance]);

  useEffect(() => {
    cohesionDistanceRef.current = cohesionDistance;
  }, [cohesionDistance]);

  useEffect(() => {
    alignmentDistanceRef.current = alignmentDistance;
  }, [alignmentDistance]);

  useEffect(() => {
    fishSpeedRef.current = fishSpeed;
  }, [fishSpeed]);

  // Fonction pour ajuster le nombre de poissons sans tout recréer
  const adjustFishCount = (newCount: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const current = entitiesRef.current.length;
    
    if (newCount > current) {
      // Ajouter des poissons
      const fishColors = [
        "#FFD700", "#FF6B35", "#4ECDC4", "#45B7D1", 
        "#96CEB4", "#FFEAA7", "#FF7675"
      ];
      
      for (let i = current; i < newCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const direction = Math.random() * 360;
        const color = fishColors[Math.floor(Math.random() * fishColors.length)];
        entitiesRef.current.push(new Entity(x, y, 12, direction, fishSpeed, color));
      }
    } else if (newCount < current) {
      // Retirer des poissons
      entitiesRef.current = entitiesRef.current.slice(0, newCount);
    }
  };

  // Fonction pour ajuster le nombre de bulles
  const adjustBubbleCount = (newCount: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const current = bubblesRef.current.length;
    
    if (newCount > current) {
      // Ajouter des bulles
      for (let i = current; i < newCount; i++) {
        bubblesRef.current.push(new Bubble(
          Math.random() * canvas.width,
          Math.random() * canvas.height
        ));
      }
    } else if (newCount < current) {
      // Retirer des bulles
      bubblesRef.current = bubblesRef.current.slice(0, newCount);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fonction pour redimensionner le canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialiser les entités et bulles une seule fois
    entitiesRef.current = createEntities(fishCount, canvas.width, canvas.height);
    bubblesRef.current = createBubbles(bubbleCount, canvas.width, canvas.height);

    let lastTime = 0;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    function gameLoop(currentTime: number) {
      if (ctx == null) return;
      if (canvas == null) return;

      if (currentTime - lastTime < frameInterval) {
        requestAnimationFrame(gameLoop);
        return;
      }
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Fond d'eau avec dégradé
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#001F3F");
      gradient.addColorStop(0.5, "#004080");
      gradient.addColorStop(1, "#002040");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Effet de vagues subtiles
      ctx.save();
      ctx.globalAlpha = 0.1;
      for (let i = 0; i < 3; i++) {
        const waveY = canvas.height * 0.2 + Math.sin(currentTime * 0.001 + i) * 20;
        const waveGradient = ctx.createLinearGradient(0, waveY - 50, 0, waveY + 50);
        waveGradient.addColorStop(0, "rgba(173, 216, 230, 0)");
        waveGradient.addColorStop(0.5, "rgba(173, 216, 230, 0.5)");
        waveGradient.addColorStop(1, "rgba(173, 216, 230, 0)");
        ctx.fillStyle = waveGradient;
        ctx.fillRect(0, waveY - 50, canvas.width, 100);
      }
      ctx.restore();

      // Mettre à jour et dessiner les bulles
      bubblesRef.current.forEach(bubble => {
        bubble.update(deltaTime, canvas.height);
        bubble.draw(ctx);
      });

      // Ajouter des nouvelles bulles aléatoirement
      if (Math.random() < 0.02 && bubblesRef.current.length < 40) {
        bubblesRef.current.push(new Bubble(Math.random() * canvas.width, canvas.height + 10));
      }

      // Appliquer les règles avec les paramètres en temps réel depuis les refs
      Entity.applySeparation(entitiesRef.current, separationDistanceRef.current, canvas.width, canvas.height);
      Entity.applyCohesion(entitiesRef.current, cohesionDistanceRef.current);
      Entity.applyAlignment(entitiesRef.current, alignmentDistanceRef.current);
      Entity.applyEdgeAvoidance(entitiesRef.current, canvas.width, canvas.height);

      // Mettre à jour la vitesse et dessiner chaque poisson
      entitiesRef.current.forEach(entity => {
        entity.velocity = fishSpeedRef.current;
        entity.nextFrame(deltaTime, entitiesRef.current, canvas.width, canvas.height);
        entity.draw(ctx);
      });

      requestAnimationFrame(gameLoop);
    }
    
    requestAnimationFrame(gameLoop);

    // Nettoyage
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []); // Garder les dépendances vides

  // Effet pour ajuster le nombre de poissons
  useEffect(() => {
    adjustFishCount(fishCount);
  }, [fishCount]);

  // Effet pour ajuster le nombre de bulles
  useEffect(() => {
    adjustBubbleCount(bubbleCount);
  }, [bubbleCount]);

  return (
    <div className="w-full h-screen bg-blue-900 overflow-hidden relative">
      <canvas 
        ref={canvasRef} 
        id="canva" 
        className="w-full h-full block" 
        style={{ 
          background: 'radial-gradient(ellipse at center, #004080 0%, #001F3F 70%, #000814 100%)',
          cursor: 'crosshair'
        }}
      />
      
      {/* Overlay d'effet aquatique */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(173, 216, 230, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(173, 216, 230, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 60% 20%, rgba(173, 216, 230, 0.06) 0%, transparent 50%)
          `,
        }}
      />

      {/* Bouton pour afficher/masquer les contrôles */}
      <button
        onClick={() => setShowControls(!showControls)}
        className="absolute top-4 right-4 bg-blue-600/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-blue-500/80 transition-colors border border-blue-400/30"
      >
        {showControls ? 'Masquer' : 'Contrôles'}
      </button>

      {/* Panneau de contrôles */}
      <div className={`absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm border-t border-blue-400/30 p-4 transform transition-transform duration-300 ${
        showControls ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="max-w-6xl mx-auto">
          <h3 className="text-white text-lg font-bold mb-3 text-center">Contrôles de l'Aquarium</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            {/* Nombre de poissons */}
            <div className="bg-blue-900/40 p-3 rounded-lg border border-blue-400/20">
              <label className="text-white font-medium mb-2 block text-sm">
                Poissons: {fishCount}
              </label>
              <input
                type="range"
                min="10"
                max="150"
                value={fishCount}
                onChange={(e) => setFishCount(Number(e.target.value))}
                className="w-full h-2 bg-blue-800 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-xs text-blue-200 mt-1">10 - 150</div>
            </div>

            {/* Distance de séparation */}
            <div className="bg-blue-900/40 p-3 rounded-lg border border-blue-400/20">
              <label className="text-white font-medium mb-2 block text-sm">
                Séparation: {separationDistance}px
              </label>
              <input
                type="range"
                min="10"
                max="80"
                value={separationDistance}
                onChange={(e) => setSeparationDistance(Number(e.target.value))}
                className="w-full h-2 bg-blue-800 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-xs text-blue-200 mt-1">Évitement</div>
            </div>

            {/* Distance de cohésion */}
            <div className="bg-blue-900/40 p-3 rounded-lg border border-blue-400/20">
              <label className="text-white font-medium mb-2 block text-sm">
                Cohésion: {cohesionDistance}px
              </label>
              <input
                type="range"
                min="50"
                max="200"
                value={cohesionDistance}
                onChange={(e) => setCohesionDistance(Number(e.target.value))}
                className="w-full h-2 bg-blue-800 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-xs text-blue-200 mt-1">Groupement</div>
            </div>

            {/* Distance d'alignement */}
            <div className="bg-blue-900/40 p-3 rounded-lg border border-blue-400/20">
              <label className="text-white font-medium mb-2 block text-sm">
                Alignement: {alignmentDistance}px
              </label>
              <input
                type="range"
                min="20"
                max="120"
                value={alignmentDistance}
                onChange={(e) => setAlignmentDistance(Number(e.target.value))}
                className="w-full h-2 bg-blue-800 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-xs text-blue-200 mt-1">Direction</div>
            </div>

            {/* Vitesse des poissons */}
            <div className="bg-blue-900/40 p-3 rounded-lg border border-blue-400/20">
              <label className="text-white font-medium mb-2 block text-sm">
                Vitesse: {fishSpeed}
              </label>
              <input
                type="range"
                min="20"
                max="150"
                value={fishSpeed}
                onChange={(e) => setFishSpeed(Number(e.target.value))}
                className="w-full h-2 bg-blue-800 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-xs text-blue-200 mt-1">Nage</div>
            </div>

            {/* Nombre de bulles */}
            <div className="bg-blue-900/40 p-3 rounded-lg border border-blue-400/20">
              <label className="text-white font-medium mb-2 block text-sm">
                Bulles: {bubbleCount}
              </label>
              <input
                type="range"
                min="0"
                max="60"
                value={bubbleCount}
                onChange={(e) => setBubbleCount(Number(e.target.value))}
                className="w-full h-2 bg-blue-800 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-xs text-blue-200 mt-1">Ambiance</div>
            </div>

          </div>

          {/* Boutons de présets */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => {
                setFishCount(80);
                setSeparationDistance(25);
                setCohesionDistance(120);
                setAlignmentDistance(60);
                setFishSpeed(70);
                setBubbleCount(35);
              }}
              className="bg-gray-600/80 hover:bg-gray-500/80 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Récif Calme
            </button>
            
            <button
              onClick={() => {
                setFishCount(120);
                setSeparationDistance(15);
                setCohesionDistance(80);
                setAlignmentDistance(40);
                setFishSpeed(120);
                setBubbleCount(50);
              }}
              className="bg-gray-600/80 hover:bg-gray-500/80 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Courant Fort
            </button>
            
            <button
              onClick={() => {
                setFishCount(30);
                setSeparationDistance(50);
                setCohesionDistance(150);
                setAlignmentDistance(80);
                setFishSpeed(50);
                setBubbleCount(15);
              }}
              className="bg-gray-600/80 hover:bg-gray-500/80 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Eaux Profondes
            </button>

            <button
              onClick={() => {
                setFishCount(50);
                setSeparationDistance(30);
                setCohesionDistance(100);
                setAlignmentDistance(50);
                setFishSpeed(80);
                setBubbleCount(25);
              }}
              className="bg-gray-600/80 hover:bg-gray-500/80 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Défaut
            </button>
          </div>

          <div className="mt-3 text-center text-blue-300 text-xs">
            Ajustez les paramètres en temps réel pour observer les changements
          </div>
        </div>
      </div>

      {/* Style pour les sliders */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e40af;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e40af;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </div>
  );
}
