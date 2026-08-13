export const isVSCode = typeof window !== 'undefined' && 'vscodeApi' in window;

export function getVSCodeApi() {
  if (isVSCode) {
    return (window as any).vscodeApi;
  }
  return null;
}
