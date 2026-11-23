// Remembered per workspace so a startup restore of the view can be told apart
// from the user opening it.
export const VIEW_WAS_VISIBLE_KEY = 'kconfig.launcherView.wasVisible';

/** Minimal persistent key/value store; vscode.Memento satisfies it. */
/* eslint-disable no-unused-vars -- parameter names in a type signature are not variables */
export interface VisibilityStateStore
{
    get<T>(key: string, defaultValue: T): T;
    update(key: string, value: unknown): PromiseLike<void>;
}
/* eslint-enable no-unused-vars */

/**
 * Opens the editor when the user shows the launcher view, but not when VS Code
 * restores a view that was already open when the window last closed.
 */
export class LauncherAutoOpen
{
    private readonly openEditor: () => void;
    private readonly state: VisibilityStateStore;
    private isVisible = false;
    private restorePending: boolean;

    constructor(openEditor: () => void, state: VisibilityStateStore)
    {
        this.openEditor = openEditor;
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
        this.openEditor();
    }
}
