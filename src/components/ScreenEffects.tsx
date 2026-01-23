import React, { useEffect, useState } from 'react';
import './ScreenEffects.css';

export type EffectType = 'confetti' | 'hearts' | 'balloons' | 'fireworks' | 'celebration';

interface ScreenEffectsProps {
  effect: EffectType | null;
  onComplete?: () => void;
}

const ScreenEffects: React.FC<ScreenEffectsProps> = ({ effect, onComplete }) => {
  const [particles, setParticles] = useState<Array<{ id: number; style: React.CSSProperties }>>([]);

  useEffect(() => {
    if (!effect) {
      setParticles([]);
      return;
    }

    const particleCount = effect === 'fireworks' ? 60 : effect === 'celebration' ? 80 : 40;
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      style: generateParticleStyle(effect, i),
    }));

    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 4000);

    return () => clearTimeout(timer);
  }, [effect, onComplete]);

  const generateParticleStyle = (effectType: EffectType, index: number): React.CSSProperties => {
    const randomX = Math.random() * 100;
    const randomDelay = Math.random() * 0.5;
    const randomDuration = 2 + Math.random() * 2;
    const randomRotation = Math.random() * 360;

    switch (effectType) {
      case 'confetti':
        return {
          left: `${randomX}%`,
          animationDelay: `${randomDelay}s`,
          animationDuration: `${randomDuration}s`,
          '--rotation': `${randomRotation}deg`,
          '--end-x': `${(Math.random() - 0.5) * 200}px`,
        } as React.CSSProperties;

      case 'hearts':
        return {
          left: `${randomX}%`,
          animationDelay: `${randomDelay}s`,
          animationDuration: `${randomDuration + 1}s`,
          '--drift': `${(Math.random() - 0.5) * 100}px`,
        } as React.CSSProperties;

      case 'balloons':
        return {
          left: `${randomX}%`,
          animationDelay: `${randomDelay}s`,
          animationDuration: `${randomDuration + 2}s`,
          '--drift': `${(Math.random() - 0.5) * 150}px`,
        } as React.CSSProperties;

      case 'fireworks':
        const angle = (index / 100) * Math.PI * 2;
        const radius = 80 + Math.random() * 120;
        const endX = Math.cos(angle) * radius;
        const endY = Math.sin(angle) * radius;
        const centerX = 20 + Math.random() * 60;
        const centerY = 20 + Math.random() * 40;
        return {
          left: `${centerX}%`,
          top: `${centerY}%`,
          '--end-x': `${endX}px`,
          '--end-y': `${endY}px`,
          animationDelay: `${randomDelay}s`,
          animationDuration: `${randomDuration}s`,
        } as React.CSSProperties;

      case 'celebration':
        return {
          left: `${randomX}%`,
          animationDelay: `${randomDelay}s`,
          animationDuration: `${randomDuration}s`,
          '--rotation': `${randomRotation}deg`,
          '--end-x': `${(Math.random() - 0.5) * 200}px`,
        } as React.CSSProperties;

      default:
        return {};
    }
  };

  const getParticleContent = (effectType: EffectType, index: number): string => {
    switch (effectType) {
      case 'confetti':
        const confettiColors = ['🟥', '🟦', '🟨', '🟩', '🟪', '🟧'];
        return confettiColors[index % confettiColors.length];

      case 'hearts':
        const hearts = ['❤️', '💕', '💖', '💗', '💓'];
        return hearts[index % hearts.length];

      case 'balloons':
        const balloons = ['🎈', '🎈', '🎈', '🎈', '🎈'];
        return balloons[index % balloons.length];

      case 'fireworks':
        return '✨';

      case 'celebration':
        const celebrationItems = ['🎉', '🎊', '✨', '🥳', '⭐', '🌟'];
        return celebrationItems[index % celebrationItems.length];

      default:
        return '';
    }
  };

  if (!effect || particles.length === 0) return null;

  return (
    <div className="screen-effects-container">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`particle particle-${effect}`}
          style={particle.style}
        >
          {getParticleContent(effect, particle.id)}
        </div>
      ))}
    </div>
  );
};

export default ScreenEffects;
