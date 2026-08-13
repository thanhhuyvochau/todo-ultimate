import planV1 from "./plan-v1.txt?raw";
import reportV1 from "./report-v1.txt?raw";

export const PLAN_PROMPT_VERSION = "v1";
export const REPORT_PROMPT_VERSION = "v1";

const PROMPTS: Record<string, string> = {
  [`plan-${PLAN_PROMPT_VERSION}`]: planV1,
  [`report-${REPORT_PROMPT_VERSION}`]: reportV1,
};

export function loadPlanPrompt(version: string = PLAN_PROMPT_VERSION): string {
  return PROMPTS[`plan-${version}`] ?? planV1;
}

export function loadReportPrompt(
  version: string = REPORT_PROMPT_VERSION,
): string {
  return PROMPTS[`report-${version}`] ?? reportV1;
}

export function fillTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    template,
  );
}
