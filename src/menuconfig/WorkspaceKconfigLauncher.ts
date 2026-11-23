import * as vscode from 'vscode';

const ROOT_KCONFIG_NAME = 'Kconfig';
export const LAUNCHER_VIEW_ID = 'kconfig.launcherView';

// Remembered per workspace so a startup restore of the view can be told apart
// from the user opening it.
const VIEW_WAS_VISIBLE_KEY = 'kconfig.launcherView.wasVisible';

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

/**
 * Opens the editor when the user shows the launcher view, but not when VS Code
 * restores a view that was already open when the window last closed.
 */
class LauncherAutoOpen
{
    private readonly openCommand: string;
    private readonly state: vscode.Memento;
    private isVisible = false;
    private restorePending: boolean;

    constructor(openCommand: string, state: vscode.Memento)
    {
        this.openCommand = openCommand;
        this.state = state;
        this.restorePending = state.get<boolean>(VIEW_WAS_VISIBLE_KEY, false);
    }

    on_visibility_changed(visible: boolean): void
    {
        void this.state.update(VIEW_WAS_VISIBLE_KEY, visible);
        const becameVisible = visible && !this.isVisible;
        this.isVisible = visible;
        if (!becameVisible)
        {
            return;
        }
        if (this.restorePending)
        {
            this.restorePending = false;
            return;
        }
        void vscode.commands.executeCommand(this.openCommand);
    }
}

export function register_launcher_view(openCommand: string, state: vscode.Memento): vscode.Disposable
{
    const treeView = vscode.window.createTreeView(LAUNCHER_VIEW_ID, {
        treeDataProvider: new EmptyTreeProvider()
    });
    const autoOpen = new LauncherAutoOpen(openCommand, state);
    autoOpen.on_visibility_changed(treeView.visible);
    const visibilityListener = treeView.onDidChangeVisibility((event) =>
    {
        autoOpen.on_visibility_changed(event.visible);
    });
    return vscode.Disposable.from(treeView, visibilityListener);
}
