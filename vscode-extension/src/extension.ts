import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
// @ts-ignore
import { parseRepository } from '../../parser/src/index.js'; // Assuming we bundle it or reference it

export function activate(context: vscode.ExtensionContext) {
  console.log('RepoMap extension is now active!');

  let disposable = vscode.commands.registerCommand('repomap.start', async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('RepoMap: Please open a workspace first.');
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'repoMap',
      'RepoMap',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, '..', 'client', 'out'))
        ]
      }
    );

    panel.webview.html = getWebviewContent(panel.webview, context.extensionPath);

    panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.type === 'OPEN_FILE') {
          if (message.file) {
            const rootPath = workspaceFolders[0].uri.fsPath;
            const fullPath = path.join(rootPath, message.file);
            const doc = await vscode.workspace.openTextDocument(fullPath);
            const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
            
            if (message.line) {
              const range = doc.lineAt(message.line - 1).range;
              editor.selection = new vscode.Selection(range.start, range.end);
              editor.revealRange(range);
            }
          }
          return;
        }

        if (message.type === 'API_REQUEST') {
          const rootPath = workspaceFolders[0].uri.fsPath;
          try {
            let data: any = null;
            if (message.endpoint === 'analyzeRepo') {
              vscode.window.showInformationMessage("RepoMap: Analyzing repository...");
              const graph = await parseRepository(rootPath);
              data = {
                graph,
                repoId: rootPath,
                commitHash: "local",
                repoUrl: rootPath
              };
            } else if (message.endpoint === 'getFileContent') {
              const fullPath = path.join(rootPath, message.payload.filePath);
              const content = fs.readFileSync(fullPath, 'utf-8');
              data = { content, commitsCount: 1 };
            }
            
            // For AI endpoints, we would use the VS Code settings
            // const config = vscode.workspace.getConfiguration('repomap');
            // const geminiKey = config.get('geminiApiKey');
            // ... (AI endpoints implementation can be done here or in server)

            panel.webview.postMessage({
              type: 'API_RESPONSE',
              messageId: message.messageId,
              data
            });
          } catch (error: any) {
            panel.webview.postMessage({
              type: 'API_RESPONSE',
              messageId: message.messageId,
              error: error.message
            });
          }
        }
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(disposable);
}

function getWebviewContent(webview: vscode.Webview, extensionPath: string): string {
  const outPath = path.join(extensionPath, '..', 'client', 'out');
  const htmlPath = path.join(outPath, 'index.html');
  
  if (!fs.existsSync(htmlPath)) {
    return `<h1>Please build the client application first using 'npm run build' in the client directory.</h1>`;
  }
  
  let html = fs.readFileSync(htmlPath, 'utf8');

  // Replace Next.js relative paths with VS Code webview URIs
  // Next.js static exports usually put assets in _next/static
  const basePath = webview.asWebviewUri(vscode.Uri.file(outPath)).toString();
  
  html = html.replace(/(href|src)="\/_next\//g, `$1="${basePath}/_next/`);
  html = html.replace(/(href|src)="\/([^"]+)"/g, `$1="${basePath}/$2"`);

  // Inject VS Code API
  html = html.replace('<head>', `<head>
    <script>
      window.vscodeApi = acquireVsCodeApi();
    </script>`);

  return html;
}

export function deactivate() {}
