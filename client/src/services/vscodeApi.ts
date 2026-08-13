import { isVSCode, getVSCodeApi } from "../utils/vscode";

let messageIdCounter = 0;
const pendingRequests = new Map<number, { resolve: Function; reject: Function }>();

if (typeof window !== "undefined") {
  window.addEventListener("message", (event) => {
    const message = event.data;
    if (message.type === "API_RESPONSE") {
      const { messageId, data, error } = message;
      const pending = pendingRequests.get(messageId);
      if (pending) {
        if (error) {
          pending.reject(new Error(error));
        } else {
          pending.resolve(data);
        }
        pendingRequests.delete(messageId);
      }
    }
  });
}

export async function fetchVsCode(endpoint: string, payload?: any) {
  const vscode = getVSCodeApi();
  if (!vscode) throw new Error("Not running in VS Code");

  const messageId = ++messageIdCounter;
  return new Promise((resolve, reject) => {
    pendingRequests.set(messageId, { resolve, reject });
    vscode.postMessage({
      type: "API_REQUEST",
      messageId,
      endpoint,
      payload
    });
  });
}
