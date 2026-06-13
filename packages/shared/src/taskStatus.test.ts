import { describe, expect, it } from "vitest";
import {
  TaskStatus,
  TASK_STATUSES,
  isTaskStatus,
  isTerminalStatus,
  taskStatusLabel,
  toTaskStatus,
} from "./taskStatus.js";

describe("TaskStatus enum ordering", () => {
  it("matches the Solidity enum order exactly", () => {
    expect(TaskStatus.Open).toBe(0);
    expect(TaskStatus.Accepted).toBe(1);
    expect(TaskStatus.Submitted).toBe(2);
    expect(TaskStatus.Verified).toBe(3);
    expect(TaskStatus.Paid).toBe(4);
    expect(TaskStatus.Cancelled).toBe(5);
    expect(TASK_STATUSES).toHaveLength(6);
  });
});

describe("isTaskStatus", () => {
  it("accepts valid enum values", () => {
    for (const s of TASK_STATUSES) expect(isTaskStatus(s)).toBe(true);
  });
  it("rejects out-of-range values", () => {
    expect(isTaskStatus(-1)).toBe(false);
    expect(isTaskStatus(6)).toBe(false);
    expect(isTaskStatus(99)).toBe(false);
  });
});

describe("toTaskStatus", () => {
  it("passes through valid numbers", () => {
    expect(toTaskStatus(3)).toBe(TaskStatus.Verified);
  });
  it("accepts bigint chain values", () => {
    expect(toTaskStatus(4n)).toBe(TaskStatus.Paid);
  });
  it("falls back to Open for unknown values (never crashes the UI)", () => {
    expect(toTaskStatus(42)).toBe(TaskStatus.Open);
    expect(toTaskStatus(-5n)).toBe(TaskStatus.Open);
  });
});

describe("taskStatusLabel", () => {
  it("returns a brand label for every status", () => {
    expect(taskStatusLabel(TaskStatus.Open)).toBe("Open for Battle");
    expect(taskStatusLabel(TaskStatus.Verified)).toBe("Victory Confirmed");
    expect(taskStatusLabel(99)).toBe("Open for Battle"); // fallback
  });
});

describe("isTerminalStatus", () => {
  it("treats Paid and Cancelled as terminal", () => {
    expect(isTerminalStatus(TaskStatus.Paid)).toBe(true);
    expect(isTerminalStatus(TaskStatus.Cancelled)).toBe(true);
  });
  it("treats all other states as non-terminal", () => {
    expect(isTerminalStatus(TaskStatus.Open)).toBe(false);
    expect(isTerminalStatus(TaskStatus.Accepted)).toBe(false);
    expect(isTerminalStatus(TaskStatus.Submitted)).toBe(false);
    expect(isTerminalStatus(TaskStatus.Verified)).toBe(false);
  });
});
