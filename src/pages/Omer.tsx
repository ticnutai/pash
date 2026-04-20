import { Profiler, type ProfilerOnRenderCallback, useRef } from "react";
import { OmerBoardDialog } from "@/components/OmerBoardDialog";

export default function OmerPage() {
  const countRef = useRef(0);
  const lastLogRef = useRef(performance.now());

  const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
    countRef.current += 1;
    const now = performance.now();
    // Log every render with delta since previous render
    // eslint-disable-next-line no-console
    console.log(
      `[OmerProfiler] #${countRef.current} phase=${phase} dur=${actualDuration.toFixed(2)}ms Δ=${(now - lastLogRef.current).toFixed(0)}ms`,
    );
    lastLogRef.current = now;

    if (countRef.current > 50) {
      // eslint-disable-next-line no-console
      console.warn("[OmerProfiler] ⚠️ More than 50 renders detected — possible loop");
    }
  };

  return (
    <Profiler id="OmerBoardDialog" onRender={onRender}>
      <OmerBoardDialog standalone />
    </Profiler>
  );
}
