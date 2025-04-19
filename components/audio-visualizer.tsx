import React, { useEffect, useRef } from "react";
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

  // Base size for the static circle
  const baseSize = 200;

  // Calculate blob parameters based on amplitude
  const edges = 12; // Number of edges for the blob
  const grow = Math.max(4, 6 - amplitude * 20); // Inverse relationship - lower grow value = more randomness

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        {/* Render blobs for each amplitude value */}
        {lastAmplitudesRef.current.map((amp, i) => {
          // Skip rendering if amplitude is too small
          if (amp < 0.01) return null;

          // Create a unique seed for each blob
          const seed = i * 1000;

          // Calculate opacity
          const opacity = Math.max(Math.min(0.9 - i * 0.3, 1), 0);

          return (
            <SvgBlob
              key={i}
              variant="solid"
              color="hsl(147 42% 22%)"
              shapeProps={{
                size: baseSize,
                edges: edges,
                seed: seed,
              }}
              transform={`scale(${1.3 + (3 - i) * 0.3 + amp ** 1.2})`}
              style={{
                zIndex: i,
                position: "absolute",
                opacity: opacity,
              }}
            />
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
