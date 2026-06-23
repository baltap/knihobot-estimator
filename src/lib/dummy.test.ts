import { describe, it, expect } from 'vitest';
import { add } from './dummy';

describe('add', () => {
  it('adds two numbers', () => {
    expect(add(1, 2)).toBe(3);
  });
});
