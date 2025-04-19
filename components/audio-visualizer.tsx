import React, { useEffect, useRef, useState } from "react";
import { SvgBlob } from "react-svg-blob";

interface AudioVisualizerProps {
  amplitude?: number;
  debug?: boolean;
}

export function AudioVisualizer({
  amplitude = 0,
  debug = true,
}: AudioVisualizerProps) {
  const lastAmplitudesRef = useRef<number[]>([0, 0, 0]);
  const [rotation, setRotation] = useState(0);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Keep last 3 amplitude values for visualization
    if (amplitude > 0) {
      console.log("DEBUG Visualizer: Received amplitude", amplitude);
    }

    lastAmplitudesRef.current = [
      ...lastAmplitudesRef.current.slice(1),
      amplitude,
    ];
  }, [amplitude]);

  useEffect(() => {
    // Rotation animation loop
    const animateRotation = () => {
      setRotation((prev) => prev + 0.05);
      animationFrameRef.current = requestAnimationFrame(animateRotation);
    };

    animationFrameRef.current = requestAnimationFrame(animateRotation);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Base size for the static circle
  const baseSize = 150;

  // Calculate blob parameters based on amplitude
  const edges = 20; // Number of edges for the blob
  const grow = 8; // Inverse relationship - lower grow value = more randomness

  const seed = 1000;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        {/* Render blobs for each amplitude value */}
        {lastAmplitudesRef.current.map((amp, i) => {
          // Skip rendering if amplitude is too small
          // if (amp < 0.01) return null;

          // Create a unique seed for each blob

          // Calculate opacity
          let opacity;
          if (amp < 0.01) {
            opacity = 0.5;
          } else {
            opacity = Math.max(Math.min(0.9 - i * 0.3, 1), 0);
          }

          let scale;

          if (amp < 0.01) {
            scale = 1.5;
          } else {
            scale = 1.3 + i ** 2 * 0.3 + amp ** (1.2 + i / 10);
          }

          return (
            <div
              className={`flex absolute w-[${baseSize}px] h-[${baseSize}px] z-[${i}] transition-scale duration-[50ms]`}
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
              }}
              key={i}
            >
              <SvgBlob
                key={i}
                variant="solid"
                color="hsl(147 42% 22%)"
                shapeProps={
                  {
                    size: baseSize,
                    edges: edges,
                    seed: seed,
                    growth: grow,
                  } as any
                }
                // transform={`scale(${scale})`}
                opacity={opacity}
                style={{
                  width: "100%",
                  height: "100%",
                }}
              />
            </div>
          );
        })}

        {/* Static white circle that's always visible */}
        <div
          className="rounded-full bg-white shadow-2xl shadow-primary/10 flex items-center justify-center z-10"
          style={{
            width: `${baseSize}px`,
            height: `${baseSize}px`,
          }}
        />
      </div>
    </div>
  );
}
