import { describe, expect, it } from "vitest";
import { appendPoint, acceptPoint, walkKm, walkTime, type Walk, type WalkPoint } from "../walking";
const point = (latitude: number, timestamp: number, segment = 1): WalkPoint => ({ latitude, longitude: 0, accuracy: 5, timestamp, segment });
const walk: Walk = { id: "test", userId: "owner", startedAt: "2026-10-22T09:00:00Z", endedAt: null, durationSeconds: 0, distanceMeters: 0, points: [], synced: false };
describe("walking GPS rules", () => {
  it("records real distance in kilometers", () => {
    const result = appendPoint(appendPoint(walk, point(0, 1000)), point(0.001, 101000));
    expect(result.distanceMeters).toBeCloseTo(111.3, 0);
    expect(walkKm(1000)).toBe("1,00");
  });
  it("records a one-kilometer GPS route without a network service", () => {
    let result = walk;
    for (let index = 0; index <= 10; index += 1) {
      result = appendPoint(result, point(index * 0.0008983, 1000 + index * 60000));
    }
    expect(result.points).toHaveLength(11);
    expect(result.distanceMeters).toBeCloseTo(1000, 0);
    expect(walkKm(result.distanceMeters)).toBe("1,00");
    expect(result.synced).toBe(false);
  });
  it("does not count distance during pause", () => {
    const result = appendPoint(appendPoint(walk, point(0, 1000)), point(1, 101000, 2));
    expect(result.distanceMeters).toBe(0);
    expect(result.points).toHaveLength(2);
  });
  it("rejects inaccurate GPS and impossible jumps", () => {
    expect(acceptPoint([], { ...point(0, 1000), accuracy: 100 })).toBe(false);
    expect(acceptPoint([point(0, 1000)], point(1, 2000))).toBe(false);
  });
  it("records duration as hours minutes seconds", () => {
    expect(walkTime(3661)).toBe("01:01:01");
  });
});