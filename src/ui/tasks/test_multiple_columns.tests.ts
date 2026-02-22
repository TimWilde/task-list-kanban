import { describe, it, expect } from "vitest";
import { Task, isTrackedTaskString } from "./task";

describe("Multiple column tags", () => {
    it("should drop secondary column tags", () => {
        const taskString = "- [ ] Task #col1 #col2";
        if (!isTrackedTaskString(taskString)) throw new Error("not tracked");
        const task = new Task(
            taskString,
            { path: "" },
            0,
            { col1: "Col 1", col2: "Col 2" } as any,
            false
        );
        expect(task.column).toBe("col1");
        expect(task.serialise()).toBe("- [ ] Task #col1");
    });
});
