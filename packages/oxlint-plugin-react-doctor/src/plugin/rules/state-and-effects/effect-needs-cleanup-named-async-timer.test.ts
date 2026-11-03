import { describe, expect, it } from "vite-plus/test";
import { runRule } from "../../../test-utils/run-rule.js";
import { effectNeedsCleanup } from "./effect-needs-cleanup.js";

const runEffectNeedsCleanup = (code: string) => runRule(effectNeedsCleanup, code);

describe("effect-needs-cleanup named async timer starters", () => {
  it("reports a named async arrow that schedules a timer after an await without a lifecycle guard", () => {
    const result = runEffectNeedsCleanup(`
      import { useEffect, useState } from "react";

      const DelayedBanner = () => {
        const [isVisible, setIsVisible] = useState(false);
        useEffect(() => {
          let timer: ReturnType<typeof setTimeout> | undefined;
          const load = async () => {
            await fetch("/banner");
            timer = setTimeout(() => setIsVisible(true), 1000);
          };
          void load();
          return () => {
            clearTimeout(timer);
          };
        }, []);
        return isVisible ? <p>banner</p> : null;
      };
    `);

    expect(result.parseErrors).toEqual([]);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it("reports a named async function expression that schedules a timer after an await without a lifecycle guard", () => {
    const result = runEffectNeedsCleanup(`
      import { useEffect, useState } from "react";

      const DelayedBanner = () => {
        const [isVisible, setIsVisible] = useState(false);
        useEffect(() => {
          let timer: ReturnType<typeof setTimeout> | undefined;
          const load = async function () {
            await fetch("/banner");
            timer = setTimeout(() => setIsVisible(true), 1000);
          };
          load();
          return () => {
            clearTimeout(timer);
          };
        }, []);
        return isVisible ? <p>banner</p> : null;
      };
    `);

    expect(result.parseErrors).toEqual([]);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it("accepts a named async arrow that checks the lifecycle guard after the await", () => {
    const result = runEffectNeedsCleanup(`
      import { useEffect, useState } from "react";

      const DelayedBanner = () => {
        const [isVisible, setIsVisible] = useState(false);
        useEffect(() => {
          let isCancelled = false;
          let timer: ReturnType<typeof setTimeout> | undefined;
          const load = async () => {
            await fetch("/banner");
            if (isCancelled) return;
            timer = setTimeout(() => setIsVisible(true), 1000);
          };
          void load();
          return () => {
            isCancelled = true;
            clearTimeout(timer);
          };
        }, []);
        return isVisible ? <p>banner</p> : null;
      };
    `);

    expect(result.parseErrors).toEqual([]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("accepts a named async arrow that schedules its timer before the first await", () => {
    const result = runEffectNeedsCleanup(`
      import { useEffect, useState } from "react";

      const DelayedBanner = () => {
        const [isVisible, setIsVisible] = useState(false);
        useEffect(() => {
          let timer: ReturnType<typeof setTimeout> | undefined;
          const load = async () => {
            timer = setTimeout(() => setIsVisible(true), 1000);
            await fetch("/banner");
          };
          void load();
          return () => {
            clearTimeout(timer);
          };
        }, []);
        return isVisible ? <p>banner</p> : null;
      };
    `);

    expect(result.parseErrors).toEqual([]);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("reports a guarded named async arrow that restarts itself from its timer", () => {
    const result = runEffectNeedsCleanup(`
      import { useEffect, useState } from "react";

      const PollStatus = () => {
        const [status, setStatus] = useState(0);
        useEffect(() => {
          let isCancelled = false;
          let timer: ReturnType<typeof setTimeout> | undefined;
          const poll = async () => {
            const response = await fetch("/status");
            if (isCancelled) return;
            setStatus(response.status);
            timer = setTimeout(() => void poll(), 1000);
          };
          void poll();
          return () => {
            isCancelled = true;
            clearTimeout(timer);
          };
        }, []);
        return <p>{status}</p>;
      };
    `);

    expect(result.parseErrors).toEqual([]);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});
