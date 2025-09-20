'use client'

import Image from "next/image";

import { useRef, useEffect, useState } from "react";

/*

function drawTriangle(ctx: CanvasRenderingContext2D, x: number, y: number){
  ctx.beginPath();
  ctx.moveTo(x, y-20);   // point 1
  ctx.lineTo(x+4, y-10);  // point 2
  ctx.lineTo(x-4, y-10); // point 3
  ctx.closePath();

  ctx.fillStyle = "blue";
  ctx.fill();
}
*/

class Entity {

  x: number;
  y: number;
  size: number;
  direction: number;
  velocity: number;
  color: string;

  constructor(x: number, y: number, size: number, direction: number, velocity: number, color: string) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.direction = direction;
    this.velocity = velocity;
    this.color = color;
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.direction * Math.PI) / 180); // conversion en radian d'ou la formule bzr
    ctx.beginPath();
    ctx.moveTo(0, -this.size / 2);
    ctx.lineTo(-this.size / 2, this.size / 2);
    ctx.lineTo(this.size / 2, this.size / 2);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }



  static applySeparation(entities: Entity[], separationDistance: number, canvasWidth: number, canvasHeight: number) {
    const margin = 20; // distance avant le bord pour tourner doucement
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    for (let i = 0; i < entities.length; i++) {
      let moveX = 0;
      let moveY = 0;
      const e1 = entities[i];

      // Séparation
      for (let j = 0; j < entities.length; j++) {
        if (i === j) continue;
        const e2 = entities[j];
        const dx = e1.x - e2.x;
        const dy = e1.y - e2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < separationDistance) {
          moveX += dx / dist;
          moveY += dy / dist;
        }
      }

      if (moveX !== 0 || moveY !== 0) {
        const targetAngle = Math.atan2(moveY, moveX) * 180 / Math.PI;
        let diff = targetAngle - e1.direction;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        e1.direction += Math.sign(diff) * 1; // +1° pour tourner doucement
      }

    }
  }


  static applyCohesion(entities: Entity[], cohesionDistance: number) {
    for (let i = 0; i < entities.length; i++) {
      let centerX = 0;
      let centerY = 0;
      let count = 0;
      const e1 = entities[i];

      for (let j = 0; j < entities.length; j++) {
        if (i === j) continue;
        const e2 = entities[j];
        const dx = e2.x - e1.x;
        const dy = e2.y - e1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < cohesionDistance) {
          centerX += e2.x;
          centerY += e2.y;
          count++;
        }
      }

      if (count > 0) {
        centerX /= count;
        centerY /= count;
        const targetAngle = Math.atan2(centerY - e1.y, centerX - e1.x) * 180 / Math.PI;
        e1.direction += (targetAngle - e1.direction) * 0.02; // lent pour pas brusque
      }
    }
  }

  static applyAlignment(entities: Entity[], alignmentDistance: number) {
    for (let i = 0; i < entities.length; i++) {
      let avgDirection = 0;
      let count = 0;
      const e1 = entities[i];

      for (let j = 0; j < entities.length; j++) {
        if (i === j) continue;
        const e2 = entities[j];
        const dx = e2.x - e1.x;
        const dy = e2.y - e1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < alignmentDistance) {
          avgDirection += e2.direction;
          count++;
        }
      }

      if (count > 0) {
        avgDirection /= count;
        e1.direction += (avgDirection - e1.direction) * 0.05; // ajustement léger
      }
    }
  }

  nextFrame(deltaTime: number, entities: Entity[], canvasWidth: number, canvasHeight: number) {
    const separationDistance = 100;
    const cohesionDistance = 1000;
    const alignmentDistance = 100;

    // 1️⃣ appliquer la séparation sur tous les boids
    Entity.applySeparation(entities, separationDistance, canvasWidth, canvasHeight);
    Entity.applyCohesion(entities, cohesionDistance);
    Entity.applyAlignment(entities, alignmentDistance);




    const rad = (this.direction * Math.PI) / 180;
    this.x += Math.sin(rad) * this.velocity * deltaTime;
    this.y -= Math.cos(rad) * this.velocity * deltaTime;

    const halfSize = this.size / 2;

    // wrap horizontal
    if (this.x < -halfSize) this.x = canvasWidth + halfSize;
    if (this.x > canvasWidth + halfSize) this.x = -halfSize;

    // wrap vertical
    if (this.y < -halfSize) this.y = canvasHeight + halfSize;
    if (this.y > canvasHeight + halfSize) this.y = -halfSize;    // petit random pour naturel
    this.direction += (Math.random() - 0.5) * 2;

  }
}

//
function createEntities(n: number, canvasWidth: number, canvasHeight: number) {
  const entities: Entity[] = [];

  for (let i = 0; i < n; i++) {
    const x = Math.random() * canvasWidth;
    const y = Math.random() * canvasHeight;
    const direction = Math.random() * 360;

    entities.push(new Entity(x, y, 10, direction, 100, "white"));
  }

  // entities.forEach(entity => {
  //   entities.forEach(other => {
  //     if (other === entity) return;
  //     // logique entre entity et other
  //   });
  // });
  return entities;
}

export default function Home() {


  const canvasRef = useRef<HTMLCanvasElement>(null);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    const entities = createEntities(50, canvas.width, canvas.height);


    let lastTime = 0;
    const targetFPS = 30;
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

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);


      entities.forEach(entity => entity.nextFrame(deltaTime, entities, canvas.width, canvas.height));

      entities.forEach(entity => entity.draw(ctx));

      requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
  }, []);

  return (

    <canvas ref={canvasRef} id="canva" className="w-full h-full block" />

  );
}
