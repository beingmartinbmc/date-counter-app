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

    const particleCount = effect === 'fireworks' ? 100 : effect === 'celebration' ? 150 : 50;
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
        const radius = 50 + Math.random() * 150;
        return {
          '--angle': `${angle}rad`,
          '--radius': `${radius}px`,
          animationDelay: `${randomDelay}s`,
          animationDuration: `${randomDuration - 0.5}s`,
        } as React.CSSProperties;

      case 'celebration':
        const isBurst = index % 3 === 0;
        return isBurst
          ? {
              left: `${randomX}%`,
              top: `${Math.random() * 30}%`,
              '--burst-x': `${(Math.random() - 0.5) * 300}px`,
              '--burst-y': `${Math.random() * 200 + 100}px`,
              animationDelay: `${randomDelay}s`,
              animationDuration: `${randomDuration}s`,
            } as React.CSSProperties
          : {
              left: `${randomX}%`,
              animationDelay: `${randomDelay + 0.3}s`,
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
        if (index % 3 === 0) return '🎉';
        if (index % 3 === 1) return '🎊';
        return '✨';

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
