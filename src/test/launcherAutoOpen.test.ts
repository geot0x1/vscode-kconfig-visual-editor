import assert from "assert";

import { LauncherAutoOpen, VIEW_WAS_VISIBLE_KEY, VisibilityStateStore } from "../menuconfig/LauncherAutoOpen";

class InMemoryStateStore implements VisibilityStateStore {
    private readonly values = new Map<string, unknown>();

    constructor(initial: Record<string, unknown> = {}) {
        Object.entries(initial).forEach(([key, value]) => this.values.set(key, value));
    }

    get<T>(key: string, defaultValue: T): T {
        return this.values.has(key) ? (this.values.get(key) as T) : defaultValue;
    }

    update(key: string, value: unknown): PromiseLike<void> {
        this.values.set(key, value);
        return Promise.resolve();
    }
}

interface Harness {
    launcher: LauncherAutoOpen;
    state: InMemoryStateStore;
    openCount: () => number;
}

function createHarness(viewWasVisibleLastSession?: boolean): Harness {
    const initial = viewWasVisibleLastSession === undefined ? {} : { [VIEW_WAS_VISIBLE_KEY]: viewWasVisibleLastSession };
    const state = new InMemoryStateStore(initial);
    let opens = 0;
    const launcher = new LauncherAutoOpen(() => {
        opens += 1;
    }, state);
    return { launcher, state, openCount: () => opens };
}

function opensOnFirstShowInFreshWorkspace(): void {
    const { launcher, openCount } = createHarness();
    launcher.on_visibility_changed(true);
    assert.strictEqual(openCount(), 1, "first show with no saved state is a user click");
}

function opensOnFirstShowWhenViewWasClosedLastSession(): void {
    const { launcher, openCount } = createHarness(false);
    launcher.on_visibility_changed(false);
    launcher.on_visibility_changed(true);
    assert.strictEqual(openCount(), 1, "view was closed last session, so showing it is a user click");
}

function skipsStartupRestoreThenOpensOnLaterShow(): void {
    const { launcher, openCount } = createHarness(true);
    launcher.on_visibility_changed(true);
    assert.strictEqual(openCount(), 0, "restoring a view that was open last session must not open the editor");

    launcher.on_visibility_changed(false);
    launcher.on_visibility_changed(true);
    assert.strictEqual(openCount(), 1, "showing the view again after the restore is a user click");
}

function ignoresRepeatedVisibleEventsWithoutHide(): void {
    const { launcher, openCount } = createHarness();
    launcher.on_visibility_changed(true);
    launcher.on_visibility_changed(true);
    assert.strictEqual(openCount(), 1, "only a hidden-to-visible transition opens the editor");
}

function doesNotOpenWhenViewStaysHidden(): void {
    const { launcher, openCount } = createHarness();
    launcher.on_visibility_changed(false);
    assert.strictEqual(openCount(), 0);
}

function persistsLatestVisibility(): void {
    const { launcher, state } = createHarness();
    launcher.on_visibility_changed(true);
    assert.strictEqual(state.get(VIEW_WAS_VISIBLE_KEY, false), true);

    launcher.on_visibility_changed(false);
    assert.strictEqual(state.get(VIEW_WAS_VISIBLE_KEY, true), false);
}

export async function runLauncherAutoOpenTests(): Promise<void> {
    opensOnFirstShowInFreshWorkspace();
    opensOnFirstShowWhenViewWasClosedLastSession();
    skipsStartupRestoreThenOpensOnLaterShow();
    ignoresRepeatedVisibleEventsWithoutHide();
    doesNotOpenWhenViewStaysHidden();
    persistsLatestVisibility();
    // eslint-disable-next-line no-console
    console.log("[Test] LauncherAutoOpen tests passed");
}
