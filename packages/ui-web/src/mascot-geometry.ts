/**
 * Gettime's Mr Minute head, ported from kp3.agency `clock-mascot.tsx` (the header clock).
 * Every feature is a set of points on the unit sphere; the ball turns (yaw/pitch), each point is
 * rotated and projected again, and anything past the silhouette is cut off. 100x100 viewBox.
 */
type V3 = [number, number, number];
type Shape = { pts: V3[]; closed: boolean };

/** Point on the front of the unit sphere from flat face coords (u right, v down, |u,v| ≤ 1). */
const onSphere = (u: number, v: number): V3 => [u, v, Math.sqrt(Math.max(0, 1 - u * u - v * v))];
/**
 * Face coords straight from the approved face artwork (pixels: centre 276,262, radius 248), so the
 * shapes below can be read against the design file.
 */
const G = (x: number, y: number) => onSphere((x - 276) / 248, (y - 262) / 248);
/** Design pixels → viewBox units (stroke widths). */
export const PX = 46 / 248;

const ellipse = (cx: number, cy: number, rx: number, ry: number, n = 20): Shape => ({
  pts: Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return G(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
  }),
  closed: true,
});

/** Rounded pill (stadium): a w×h box with fully round ends; `h` may shrink for the wink. */
const pill = (cx: number, cy: number, w: number, h: number, n = 10): Shape => {
  const r = Math.min(w, h) / 2;
  const half = Math.max(h / 2 - r, 0);
  const pts: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI; // top cap, left → right
    pts.push(G(cx + r * Math.cos(a), cy - half + r * Math.sin(a)));
  }
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI; // bottom cap, right → left
    pts.push(G(cx + r * Math.cos(a), cy + half + r * Math.sin(a)));
  }
  return { pts, closed: true };
};

/** Smooth open curve through design points (Catmull-Rom, `k` samples per segment), in design pixels. */
const smooth2d = (ctrl: [number, number][], k = 6): [number, number][] => {
  const pts: [number, number][] = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(i - 1, 0)];
    const p1 = ctrl[i];
    const p2 = ctrl[i + 1];
    const p3 = ctrl[Math.min(i + 2, ctrl.length - 1)];
    for (let j = 0; j < k; j++) {
      const t = j / k;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a: number, b: number, d: number, e: number) =>
        0.5 *
        (2 * b + (-a + d) * t + (2 * a - 5 * b + 4 * d - e) * t2 + (-a + 3 * b - 3 * d + e) * t3);
      pts.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  pts.push(ctrl[ctrl.length - 1]);
  return pts;
};

// Moustache: curled tip → two waves → dip at the centre, mirrored for the right side.
const MOUSTACHE_L: [number, number][] = [
  [158, 281],
  [148, 295],
  [154, 310],
  [170, 318],
  [190, 316],
  [210, 304],
  [230, 293],
  [250, 295],
  [266, 308],
  [276, 318],
];
const MOUSTACHE_2D = smooth2d([
  ...MOUSTACHE_L,
  ...MOUSTACHE_L.slice(0, -1)
    .reverse()
    .map(([x, y]) => [552 - x, y] as [number, number]),
]);
const MOUSTACHE_PIVOT: [number, number] = [276, 320]; // the knot it hangs from
/**
 * Moustache with secondary motion: `sway` (radians) see-saws it round the knot, `flap` (design px)
 * lifts both tips; both act more toward the tips (soft material), nothing at the centre.
 */
const moustache = (sway: number, flap: number): Shape => {
  const [px, py] = MOUSTACHE_PIVOT;
  return {
    pts: MOUSTACHE_2D.map(([x, y]) => {
      const w = Math.min(Math.abs(x - px) / 128, 1); // 0 centre → 1 tip
      const a = sway * w ** 1.3;
      const dx = x - px;
      const dy = y - py;
      const rx = px + dx * Math.cos(a) - dy * Math.sin(a);
      const ry = py + dx * Math.sin(a) + dy * Math.cos(a) - flap * w * w;
      return G(rx, ry);
    }),
    closed: false,
  };
};
/** Round knot under the middle of the moustache. */
const KNOT = ellipse(276, 331, 13, 13, 16);
/** Bow tie: two wings and a centre knot. */
const BOW: Shape[] = [
  {
    pts: [
      [230, 389],
      [268, 407],
      [268, 423],
      [230, 441],
      [224, 436],
      [224, 394],
    ].map(([x, y]) => G(x, y)),
    closed: true,
  },
  {
    pts: [
      [322, 389],
      [284, 407],
      [284, 423],
      [322, 441],
      [328, 436],
      [328, 394],
    ].map(([x, y]) => G(x, y)),
    closed: true,
  },
  pill(276, 415, 22, 26, 6),
];

/** Eye at `cx` squashed by `shut` (0 open → 1 closed); closed eyes are drawn by the shapes below. */
const eye = (cx: number, shut: number) =>
  pill(cx, 226 + shut * 10, 38, Math.max(56 * (1 - shut), 3));
/** Specular glints in the eyes (upper-left, toward the fixed key light). */
const GLINT_L = ellipse(208, 210, 5, 8, 12);
const GLINT_R = ellipse(328, 210, 5, 8, 12);

/** A circle of latitude around the face (angular radius `deg`), e.g. the bezel ring. */
const latitude = (deg: number, n = 72): Shape => {
  const a = (deg * Math.PI) / 180;
  return {
    pts: Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      return [Math.sin(a) * Math.sin(t), -Math.sin(a) * Math.cos(t), Math.cos(a)] as V3;
    }),
    closed: true,
  };
};
/** Thin inner ring (design radius 204 of 248). */
const RING = latitude((Math.asin(204 / 248) * 180) / Math.PI);
/** Hour marks of the design: a pill at 12, short dashes at 9 and 3 (6 is where the bow tie sits). */
const TICK_12: Shape = { pts: [G(276, 112), G(276, 136)], closed: false };
const TICKS: Shape[] = [
  { pts: [G(98, 283), G(126, 283)], closed: false },
  { pts: [G(426, 283), G(454, 283)], closed: false },
];
export const R = 46; // ball radius in the 100×100 viewBox
/** Key light straight at the face, a touch from above (unit vector; y is down). */
const LIGHT: V3 = (() => {
  const v: V3 = [0, -0.14, 1];
  const n = Math.hypot(...v);
  return [v[0] / n, v[1] / n, v[2] / n];
})();
const FACING_REST = LIGHT[2]; // how much the face looks at the light when it faces the viewer

/** Rotate by pitch (down positive) then yaw (right positive); returns screen x, y and depth z. */
function project([x, y, z]: V3, yaw: number, pitch: number): V3 {
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const y1 = y * cp + z * sp;
  const z1 = -y * sp + z * cp;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x2 = x * cy + z1 * sy;
  const z2 = -x * sy + z1 * cy;
  return [50 + R * x2, 50 + R * y1, z2];
}

/** SVG path for a shape, keeping only the parts in front of the silhouette (z > 0). */
function toPath(shape: Shape, yaw: number, pitch: number) {
  const p = shape.pts.map((pt) => project(pt, yaw, pitch));
  const visible = p.every((q) => q[2] > 0);
  if (visible) {
    const d = p.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join("");
    return shape.closed ? `${d}Z` : d;
  }
  // Partly hidden: draw only the visible runs (open strokes; filled shapes simply drop out).
  if (shape.closed && p.some((q) => q[2] <= 0) && shape.pts.length < 30) return "";
  let d = "";
  let pen = false;
  const pts = shape.closed ? [...p, p[0]] : p;
  for (const q of pts) {
    if (q[2] > 0.02) {
      d += `${pen ? "L" : "M"}${q[0].toFixed(2)} ${q[1].toFixed(2)}`;
      pen = true;
    } else pen = false;
  }
  return d;
}

/** Max degrees the ball turns toward the pointer. */
export const TILT = 30;

export interface HeadFrame {
  ring: string;
  tick12: string;
  ticks: string;
  eyes: string;
  moustache: string;
  knot: string;
  bow: string;
  glints: string;
  /** Ring shade runs from its most lit to its most shaded visible point. */
  ringShade: [number, number, number, number];
  shell: { cx: number; cy: number; r: number; mid: number; edge: number };
  pool: { cx: number; cy: number; opacity: number };
  spec: { cx: number; cy: number };
}

/** Paths and lighting for the head turned by `yaw`/`pitch` (radians), moustache `sway`/`flap`. */
export function headFrame(yaw: number, pitch: number, sway = 0, flap = 0): HeadFrame {
  let lit: V3 = [50, 50, 1];
  let shadow: V3 = [50, 50, 1];
  let hi = -Infinity;
  let lo = Infinity;
  for (const pt of RING.pts) {
    const q = project(pt, yaw, pitch);
    if (q[2] <= 0) continue;
    const b = ((q[0] - 50) / R) * LIGHT[0] + ((q[1] - 50) / R) * LIGHT[1] + q[2] * LIGHT[2];
    if (b > hi) {
      hi = b;
      lit = q;
    }
    if (b < lo) {
      lo = b;
      shadow = q;
    }
  }
  // Light responds to the turn: lighter when the face turns toward the front key light,
  // heavier shade when it turns away.
  const [nx, ny, nz] = project([0, 0, 1], yaw, pitch).map((v, i) =>
    i < 2 ? (v - 50) / R : v,
  ) as V3;
  const facing = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
  const dark = Math.min(Math.max(1 + (FACING_REST - facing) * 1.6, 0.35), 1.5);
  return {
    ring: toPath(RING, yaw, pitch),
    tick12: toPath(TICK_12, yaw, pitch),
    ticks: TICKS.map((t) => toPath(t, yaw, pitch)).join(""),
    eyes: toPath(eye(216, 0), yaw, pitch) + toPath(eye(336, 0), yaw, pitch),
    moustache: toPath(moustache(sway, flap), yaw, pitch),
    knot: toPath(KNOT, yaw, pitch),
    bow: BOW.map((b) => toPath(b, yaw, pitch)).join(""),
    glints: toPath(GLINT_L, yaw, pitch) + toPath(GLINT_R, yaw, pitch),
    ringShade: [lit[0], lit[1], shadow[0], shadow[1]],
    shell: {
      cx: 0.5 + nx * 0.2,
      cy: 0.47 + ny * 0.2,
      r: Math.min(Math.max(0.6 + (facing - FACING_REST) * 0.3, 0.5), 0.72),
      mid: 0.06 * dark,
      edge: Math.min(0.24 * dark, 0.3),
    },
    pool: {
      cx: 50 + nx * 14,
      cy: 92 + ny * 10,
      opacity: Math.min(Math.max(1.5 - dark * 0.5, 0.4), 1.2) * 0.3,
    },
    spec: { cx: 50 + nx * 9, cy: 24 + ny * 9 },
  };
}
