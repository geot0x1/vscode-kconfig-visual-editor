import * as vscode from 'vscode';

const ROOT_KCONFIG_NAME = 'Kconfig';
export const LAUNCHER_VIEW_ID = 'kconfig.launcherView';

export async function find_root_kconfig(): Promise<{ folder: vscode.WorkspaceFolder; file: vscode.Uri } | undefined>
{
    const folders = vscode.workspace.workspaceFolders ?? [];
    for (const folder of folders)
    {
        const candidate = vscode.Uri.joinPath(folder.uri, ROOT_KCONFIG_NAME);
        try
        {
            await vscode.workspace.fs.stat(candidate);
            return { folder, file: candidate };
        }
        catch
        {
            continue;
        }
    }
    return undefined;
}

class EmptyTreeProvider implements vscode.TreeDataProvider<never>
{
    getTreeItem(element: never): vscode.TreeItem
    {
        return element;
    }

    getChildren(): never[]
    {
        return [];
    }
}

export function register_launcher_view(openCommand: string): vscode.Disposable
{
    const treeView = vscode.window.createTreeView(LAUNCHER_VIEW_ID, {
        treeDataProvider: new EmptyTreeProvider()
    });
    const visibilityListener = treeView.onDidChangeVisibility((event) =>
    {
        if (event.visible)
        {
            void vscode.commands.executeCommand(openCommand);
        }
    });
    return vscode.Disposable.from(treeView, visibilityListener);
}
