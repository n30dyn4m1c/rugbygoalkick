// ---------------------------------------------------------------------------
// Field & goalpost dimensions (metres). Goal line at z = GOALPOST_Z, kicker
// faces -Z, +X is to the kicker's right.
// ---------------------------------------------------------------------------
export const GOALPOST_Z = -50;
export const IN_GOAL_DEPTH = 10;
export const DEAD_BALL_Z = GOALPOST_Z - IN_GOAL_DEPTH;
export const FIELD_WIDTH = 68;
// Rugby league goal: uprights 5.5 m apart, crossbar 3 m high.
export const POST_GAP = 5.5;
export const POST_HALF_WIDTH = POST_GAP / 2;
export const UPRIGHT_HEIGHT = 16;
export const CROSSBAR_HEIGHT = 3;

// ---------------------------------------------------------------------------
// Game rules & tuning
// ---------------------------------------------------------------------------
export const TOTAL_ROUNDS = 10;
export const GRAVITY = 9.8;
export const POINTS_PER_GOAL = 2; // league conversion
export const MAX_AIM_YAW = (85 * Math.PI) / 180; // never aim behind the kicker

export const BALL_TEE_Y = 0.3;

// ---------------------------------------------------------------------------
// Flight physics (fixed step, quadratic drag against the wind-relative velocity)
// ---------------------------------------------------------------------------
export const PHYSICS_HZ = 120;
export const BALL_RADIUS = 0.11; // collision sphere approximating the ball
export const DRAG_K = 0.008; // ½ρC_dA/m (1/m), tuned: 35 m makeable, 45 m wide into a headwind hard
export const UPRIGHT_RADIUS = 0.08;
export const CROSSBAR_RADIUS = 0.07;
export const POST_RESTITUTION = 0.5;
export const POST_FRICTION = 0.85; // tangential speed kept on a post hit
export const GROUND_RESTITUTION = 0.45;
export const GROUND_FRICTION = 0.75;

export const KICK_SPEED_MIN = 12;
export const KICK_SPEED_MAX = 32;
export const ELEVATION_MIN_DEG = 20;
export const ELEVATION_MAX_DEG = 55;
export const ELEVATION_DEFAULT_DEG = 38;

// Tee placement along the conversion line (metres from the goal line)
export const TEE_DIST_MIN = 5;
export const TEE_DIST_MAX = 45;
