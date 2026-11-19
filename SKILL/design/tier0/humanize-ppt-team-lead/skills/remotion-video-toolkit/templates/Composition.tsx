// Starter composition for a deck video slot.
// Copy to <project>/src/<Slot>.tsx, then register it in src/Root.tsx with the
// slot's duration: <Composition id="Slot1" component={Slot1} durationInFrames={240}
//   fps={30} width={1920} height={1080} defaultProps={{ label: "slot 1" }} />
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type SlotProps = {
  label: string;
  accent?: string;
  background?: string;
};

export const Slot: React.FC<SlotProps> = ({
  label,
  accent = "#e8b04b",
  background = "#0f1115",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames - 1],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        background,
        opacity: fadeOut,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "PingFang SC, Noto Sans CJK SC, sans-serif",
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - enter) * 40}px) scale(${0.96 + enter * 0.04})`,
          opacity: enter,
          color: "#f4f4f5",
          textAlign: "center",
        }}
      >
        <div style={{ color: accent, letterSpacing: "0.18em", fontSize: 20 }}>
          SLOT
        </div>
        <div style={{ fontSize: 88, fontWeight: 600, lineHeight: 1.1 }}>{label}</div>
      </div>
    </AbsoluteFill>
  );
};
