import { describe, expect, it } from "vitest";
import { projectWalk, routeSegments } from "../walking-map";
import type { WalkPoint } from "../walking";

const point = (latitude: number, longitude: number, segment = 1): WalkPoint => ({ latitude, longitude, accuracy: 5, timestamp: 1000, segment });
describe("offline GPS map", () => {
  it("projects saved GPS points in metres without any network", () => {
    const result = projectWalk([point(0, 0), point(0.001, 0.001)]);
    expect(result.points).toHaveLength(2);
    expect(result.points[1]?.x).toBeCloseTo(111.32, 1);
    expect(result.points[1]?.y).toBeCloseTo(-111.32, 1);
    expect(result.span).toBeGreaterThan(111.32);
  });
  it("keeps paused routes separate rather than drawing a false connection", () => {
    const { points } = projectWalk([point(-23, -46), point(-23.001, -46), point(-23.002, -46, 2)]);
    const segments = routeSegments(points);
    expect(segments.map(s => s.length)).toEqual([2, 1]);
  });
  it("frames a single saved point and an empty route safely", () => {
    expect(projectWalk([]).points).toEqual([]);
    const result = projectWalk([point(-23, -46)]);
    expect(result.center).toEqual({ x: 0, y: 0 });
    expect(result.span).toBe(135);
  });
  it("does not draw across the world at the date line", () => {
    const result = projectWalk([point(0, 179.999), point(0, -179.999)]);
    expect(result.points[1]?.x).toBeCloseTo(222.64, 1);
  });
});