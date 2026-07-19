/** 揭示序列阶段：typing → sweep → flip → data → quote → done */
export type RevealPhase = 'typing' | 'sweep' | 'flip' | 'data' | 'quote' | 'done';

const PHASE_ORDER: RevealPhase[] = ['typing', 'sweep', 'flip', 'data', 'quote', 'done'];

/** 当前阶段是否已到达 target 阶段 */
export function phaseAtLeast(phase: RevealPhase, target: RevealPhase): boolean {
  return PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(target);
}
