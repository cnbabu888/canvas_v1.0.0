/**
 * 2D Vector class
 * Simplified from Ketcher (Apache 2.0 license)
 */

export interface Point {
  x: number;
  y: number;
}

export class Vec2 {
  x: number;
  y: number;

  constructor(x?: number | Point | Vec2, y?: number) {
    if (arguments.length === 0) {
      this.x = 0;
      this.y = 0;
    } else if (arguments.length === 1) {
      if (typeof x === 'number') {
        this.x = x;
        this.y = x;
      } else {
        this.x = (x as Point).x;
        this.y = (x as Point).y;
      }
    } else {
      this.x = x as number;
      this.y = y!;
    }
  }

  static dist(a: Vec2, b: Vec2): number {
    return a.sub(b).length();
  }

  static max(v1: Vec2, v2: Vec2): Vec2 {
    return new Vec2(Math.max(v1.x, v2.x), Math.max(v1.y, v2.y));
  }

  static min(v1: Vec2, v2: Vec2): Vec2 {
    return new Vec2(Math.min(v1.x, v2.x), Math.min(v1.y, v2.y));
  }

  add(v: Vec2): Vec2 {
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  sub(v: Vec2): Vec2 {
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  scaled(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s);
  }

  normalized(): Vec2 {
    const len = this.length();
    return len > 0 ? this.scaled(1 / len) : new Vec2(0, 0);
  }

  negated(): Vec2 {
    return new Vec2(-this.x, -this.y);
  }

  addScaled(v: Vec2, f: number): Vec2 {
    return new Vec2(this.x + v.x * f, this.y + v.y * f);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  equals(v: Vec2): boolean {
    return this.x === v.x && this.y === v.y;
  }

  dot(v: Vec2): number {
    return this.x * v.x + this.y * v.y;
  }

  cross(v: Vec2): number {
    return this.x * v.y - this.y * v.x;
  }

  /**
   * Check if coordinates are valid (not NaN and finite)
   */
  isValid(): boolean {
    return !isNaN(this.x) && !isNaN(this.y) && isFinite(this.x) && isFinite(this.y);
  }

  rotate(angle: number): Vec2 {
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c);
  }

  rotateAroundVector(angle: number, v: Vec2): Vec2 {
    return this.sub(v).rotate(angle).add(v);
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  angleTo(v: Vec2): number {
    return Math.atan2(this.cross(v), this.dot(v));
  }

  turnLeft(): Vec2 {
    return new Vec2(-this.y, this.x);
  }

  // --- v3.3 Compatibility Methods ---
  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  minus(v: Vec2): Vec2 {
    return this.sub(v);
  }

  scale(s: number): Vec2 {
    return this.scaled(s);
  }

  distance(v: Vec2): number {
    return Vec2.dist(this, v);
  }

  get mag(): number {
    return this.length();
  }

  normalize(): Vec2 {
    return this.normalized();
  }
}
