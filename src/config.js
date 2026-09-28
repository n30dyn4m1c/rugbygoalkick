// ---------------------------------------------------------------------------
// Field & goalpost dimensions (metres). Goal line at z = GOALPOST_Z, kicker
// faces -Z, +X is to the kicker's right.
// ---------------------------------------------------------------------------
export const GOALPOST_Z = -50;
export const IN_GOAL_DEPTH = 10;
export const DEAD_BALL_Z = GOALPOST_Z - IN_GOAL_DEPTH;
export const FIELD_WIDTH = 68;
export const UPRIGHT_HEIGHT = 15;
export const UPRIGHT_SEPARATION = 5.6;
export const CROSSBAR_HEIGHT = 3;

// ---------------------------------------------------------------------------
// Game rules & tuning
// ---------------------------------------------------------------------------
export const TOTAL_ROUNDS = 10;
export const GRAVITY = 9.8;
export const MAX_SPEED = 32;
export const KICK_ANGLE_RAD = Math.PI / 4.2;
export const POWER_SPEED = 0.7;
export const AIM_SPEED = 0.02;
export const MAX_AIM_OFFSET = Math.PI / 3;
export const TILT_SPEED = 0.015;
export const MAX_TILT = 2;

export const BALL_TEE_Y = 0.3;
export const BALL_GROUND_Y = 0.33;
