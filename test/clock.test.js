import { describe, it, expect } from 'vitest';
import { createClock } from '../src/core/clock.js';

describe('game clock', () => {
  it('fires timers only as game time advances', () => {
    const clock = createClock();
    let fired = 0;
    clock.after(3, () => fired++);
    clock.advance(2.9);
    expect(fired).toBe(0);
    clock.advance(0.2);
    expect(fired).toBe(1);
    clock.advance(10);
    expect(fired).toBe(1);
  });

  it('does not fire while paused (not advanced)', () => {
    const clock = createClock();
    let fired = false;
    clock.after(0.1, () => (fired = true));
    expect(fired).toBe(false);
    expect(clock.pending).toBe(1);
  });

  it('fires in time order within one large step', () => {
    const clock = createClock();
    const order = [];
    clock.after(2, () => order.push('b'));
    clock.after(1, () => order.push('a'));
    clock.advance(5);
    expect(order).toEqual(['a', 'b']);
  });

  it('can cancel and clear', () => {
    const clock = createClock();
    let n = 0;
    const id = clock.after(1, () => n++);
    clock.cancel(id);
    clock.after(1, () => n++);
    clock.clear();
    clock.advance(2);
    expect(n).toBe(0);
  });

  it('allows a timer to schedule another', () => {
    const clock = createClock();
    let n = 0;
    clock.after(1, () => clock.after(1, () => n++));
    clock.advance(1);
    clock.advance(1);
    expect(n).toBe(1);
  });
});
