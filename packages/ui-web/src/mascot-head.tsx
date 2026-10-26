import type { CSSProperties } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { headFrame, PX, TILT } from "./mascot-geometry.js";

/** Gettime's Mr Minute head (the kp3.agency header clock). */
const REST = headFrame(0, 0);

export interface MascotHeadColors {
  /** Ball fill, lit top-left to shaded bottom-right. */
  shellLight: string;
  shellDark: string;
  /** Clock dial inside the bezel ring; omit for a single-colour ball. */
  dial?: string;
  /** Eyes, moustache, bow tie and hour marks. */
  ink: string;
  /** Glass shade around the rim. */
  rim: string;
  ringLit: string;
  ringMid: string;
  ringDark: string;
}

/** The kp3.agency header colours (white ball on light pages). */
export const GETTIME_HEAD_COLORS: MascotHeadColors = {
  shellLight: "#f6f8f6",
  shellDark: "#f6f8f6",
  ink: "#1f2925",
  rim: "#9fb2a8",
  ringLit: "#ffffff",
  ringMid: "#dfe6e2",
  ringDark: "#a9b8b0",
};

export function MascotHead({
  size,
  colors = GETTIME_HEAD_COLORS,
  follow = false,
  className,
  style,
}: {
  size: number;
  colors?: MascotHeadColors;
  /** Turn toward the pointer (up to 30°), the moustache swinging after the turn. */
  follow?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const id = useId().replace(/[^a-zA-Z0-9-_]/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const [frame, setFrame] = useState(REST);

  useEffect(() => {
    if (!follow || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = { yaw: 0, pitch: 0 };
    const state = { yaw: 0, pitch: 0, sway: 0, flap: 0 };
    const spring = { sway: 0, flap: 0 };
    let raf = 0;
    const tick = () => {
      const lastYaw = state.yaw;
      const lastPitch = state.pitch;
      state.yaw += (target.yaw - state.yaw) * 0.08;
      state.pitch += (target.pitch - state.pitch) * 0.08;
      // Underdamped moustache: ≤12° sway, ≤10px tip bob, dies out in about a second.
      spring.sway += -0.07 * state.sway - 0.1 * spring.sway - (state.yaw - lastYaw) * 0.25;
      spring.flap += -0.07 * state.flap - 0.1 * spring.flap + (state.pitch - lastPitch) * 12;
      state.sway = Math.max(-0.21, Math.min(0.21, state.sway + spring.sway));
      state.flap = Math.max(-10, Math.min(10, state.flap + spring.flap));
      setFrame(headFrame(state.yaw, state.pitch, state.sway, state.flap));
      const moving =
        Math.abs(target.yaw - state.yaw) + Math.abs(target.pitch - state.pitch) > 1e-4 ||
        Math.abs(state.sway) + Math.abs(spring.sway) > 1e-4 ||
        Math.abs(state.flap) + Math.abs(spring.flap) > 1e-3;
      raf = moving ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (event: PointerEvent) => {
      const box = svgRef.current?.getBoundingClientRect();
      if (!box) return;
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      // Ramp up over ~240px, then hold the direction: the face turns to the pointer.
      const reach = (Math.min(dist / 240, 1) * TILT * Math.PI) / 180;
      target.yaw = (dx / dist) * reach;
      target.pitch = (dy / dist) * reach;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [follow]);

  // Small icons drop the bevel and glints and get bolder lines so they stay legible.
  const lod = size < 48;
  const sw = lod ? 1.35 : 1;
  const bevel = lod ? undefined : `url(#${id}-bevel)`;

  return (
    <svg
      ref={svgRef}
      data-mascot="gettime"
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={className}
      style={{ width: size, height: size, flex: "none", ...style }}
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={colors.shellLight} />
          <stop offset="1" stopColor={colors.shellDark} />
        </linearGradient>
        <radialGradient
          id={`${id}-shell`}
          cx={frame.shell.cx}
          cy={frame.shell.cy}
          fx={frame.shell.cx}
          fy={frame.shell.cy}
          r={frame.shell.r}
        >
          <stop offset="0.55" stopColor={colors.rim} stopOpacity="0" />
          <stop offset="0.85" stopColor={colors.rim} stopOpacity={frame.shell.mid} />
          <stop offset="1" stopColor={colors.rim} stopOpacity={frame.shell.edge} />
        </radialGradient>
        <linearGradient
          id={`${id}-ring`}
          gradientUnits="userSpaceOnUse"
          x1={frame.ringShade[0]}
          y1={frame.ringShade[1]}
          x2={frame.ringShade[2]}
          y2={frame.ringShade[3]}
        >
          <stop offset="0" stopColor={colors.ringLit} />
          <stop offset="0.45" stopColor={colors.ringMid} />
          <stop offset="1" stopColor={colors.ringDark} />
        </linearGradient>
        <radialGradient id={`${id}-spec`}>
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-pool`} cx="0.5" cy="1" r="0.6">
          <stop offset="0" stopColor={colors.rim} stopOpacity="0.42" />
          <stop offset="0.55" stopColor={colors.rim} stopOpacity="0.1" />
          <stop offset="1" stopColor={colors.rim} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-ball`}>
          <circle cx="50" cy="50" r="46" />
        </clipPath>
        {lod ? null : (
          <filter
            id={`${id}-bevel`}
            filterUnits="userSpaceOnUse"
            x="-40"
            y="-30"
            width="180"
            height="190"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.9" result="height" />
            <feSpecularLighting
              in="height"
              surfaceScale="2.4"
              specularConstant="0.85"
              specularExponent="16"
              lightingColor="#ffffff"
              result="spec"
            >
              <fePointLight x="50" y="36" z="70" />
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
            <feOffset in="SourceAlpha" dx="-1" dy="-1.1" result="up" />
            <feComposite in="SourceAlpha" in2="up" operator="out" result="edge" />
            <feGaussianBlur in="edge" stdDeviation="0.5" result="edgeSoft" />
            <feFlood floodColor="#000000" floodOpacity="0.38" />
            <feComposite in2="edgeSoft" operator="in" />
            <feComposite in2="SourceAlpha" operator="in" result="shade" />
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.1" result="sBlur" />
            <feOffset in="sBlur" dx="0.9" dy="1.5" result="sOff" />
            <feFlood floodColor="#000000" floodOpacity="0.28" />
            <feComposite in2="sOff" operator="in" result="drop" />
            <feMerge>
              <feMergeNode in="drop" />
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="shade" />
              <feMergeNode in="specIn" />
            </feMerge>
          </filter>
        )}
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#${id}-body)`} />
      {colors.dial ? <path d={frame.ring} fill={colors.dial} /> : null}
      <circle cx="50" cy="50" r="46" fill={`url(#${id}-shell)`} />
      <ellipse
        cx={frame.pool.cx}
        cy={frame.pool.cy}
        rx="36"
        ry="20"
        fill={`url(#${id}-pool)`}
        clipPath={`url(#${id}-ball)`}
        opacity={frame.pool.opacity}
      />
      <ellipse
        cx={frame.spec.cx}
        cy={frame.spec.cy}
        rx="16"
        ry="8"
        fill={`url(#${id}-spec)`}
        clipPath={`url(#${id}-ball)`}
      />
      <g filter={bevel} fill="none" strokeLinecap="round">
        <path d={frame.ring} stroke={`url(#${id}-ring)`} strokeWidth={11 * PX * sw} />
        <path d={frame.tick12} stroke={colors.ink} strokeWidth={17 * PX * sw} />
        <path d={frame.ticks} stroke={colors.ink} strokeWidth={13 * PX * sw} />
      </g>
      <g filter={bevel}>
        <path d={frame.eyes} fill={colors.ink} />
        <path
          d={frame.moustache}
          fill="none"
          stroke={colors.ink}
          strokeWidth={21 * PX * sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d={frame.knot} fill={colors.ink} />
        <path d={frame.bow} fill={colors.ink} strokeLinejoin="round" />
      </g>
      {lod ? null : <path d={frame.glints} fill="#ffffff" fillOpacity="0.9" />}
    </svg>
  );
}
