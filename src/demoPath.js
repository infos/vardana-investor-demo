// Demo base path, gated by VITE_DEMO_TOKEN env var.
// All demo routes branch off this prefix.
const token = import.meta.env.VITE_DEMO_TOKEN;
export const DEMO_BASE = token ? `/demo/${token}` : '/demo';
export const CLINICAL_BASE = token ? `/demo/clinical/${token}` : '/demo/clinical';
