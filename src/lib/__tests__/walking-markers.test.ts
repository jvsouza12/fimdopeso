import { describe, expect, it } from "vitest";
import { kilometreMarks } from "../walking-map";
import { acceptPoint, walkPace, type WalkPoint } from "../walking";

const point = (latitude: number, segment = 1): WalkPoint => ({
  latitude, longitude: 0, accuracy: 5, timestamp: 1000, segment,
});

describe("offline walking markers", () => {
  it("places each complete kilometer along the saved route", () => {
    const marks = kilometreMarks([point(0), point(0.01), point(0.02)]);
    expect(marks.map(mark => mark.km)).toEqual([1, 2]);
    expect(marks[0].y).toBeCloseTo(-1000, 0);
    expect(marks[1].y).toBeCloseTo(-2000, 0);
  });

  it("does not create kilometers across a pause or signal gap", () => {
    expect(kilometreMarks([point(0), point(1, 2)])).toEqual([]);
  });

  it("keeps accumulated distance when a new segment starts", () => {
    const marks = kilometreMarks([point(0), point(0.005), point(1, 2), point(1.005, 2)]);
    expect(marks).toHaveLength(1);
    expect(marks[0].segment).toBe(2);
    expect(marks[0].km).toBe(1);
  });

  it("handles empty and stationary routes", () => {
    expect(kilometreMarks([])).toEqual([]);
    expect(kilometreMarks([point(0), point(0)])).toEqual([]);
  });

  it("formats pace without displaying invalid values", () => {
    expect(walkPace(1000, 600)).toBe("10:00");
    expect(walkPace(0, 60)).toBe("—");
    expect(walkPace(1000, NaN)).toBe("—");
  });

  it("rejects invalid GPS timestamps", () => {
    expect(acceptPoint([], { ...point(0), timestamp: NaN })).toBe(false);
    expect(acceptPoint([], { ...point(0), timestamp: 0 })).toBe(false);
  });
});
