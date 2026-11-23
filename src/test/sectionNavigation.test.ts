import assert from "assert";

import { Menu, menuType } from "../menuconfig/Menu";
import { buildNavEntries } from "../views/webview/themes/modern/useSectionNavigation";
import type { DisplayRow, RowType } from "../views/webview/themes/modern/types";

function createMenu(overrides: Partial<Menu>): Menu {
    return {
        id: overrides.id || "",
        name: overrides.name || "",
        title: overrides.title || "",
        type: overrides.type || menuType.menu,
        value: overrides.value ?? false,
        children: [],
        help: "",
        range: [],
        isVisible: true,
        isCollapsed: false,
        dependsOn: "",
        isMenuconfig: false,
        hasPrompt: true,
        select: [],
        selectedBy: [],
    };
}

function createRow(id: string, type: RowType, level: number, ancestors: string[], item: Partial<Menu> = {}): DisplayRow {
    return {
        id,
        item: createMenu({ id, ...item }),
        level,
        type,
        ancestors,
        collapsed: false,
        hidden: false,
        hasChildren: type === "menu",
    };
}

function includesOnlyMenuRows(): void {
    const rows = [
        createRow("net", "menu", 0, [], { title: "Network" }),
        createRow("port", "int", 1, ["net"], { title: "Port" }),
        createRow("note", "comment", 1, ["net"], { title: "Note" }),
        createRow("mode", "choice", 1, ["net"], { title: "Mode" }),
    ];
    const ids = buildNavEntries(rows).map((entry) => entry.id);
    assert.deepStrictEqual(ids, ["net"]);
}

function excludesMenusDeeperThanMaxDepth(): void {
    const rows = [
        createRow("l0", "menu", 0, [], { title: "Level 0" }),
        createRow("l1", "menu", 1, ["l0"], { title: "Level 1" }),
        createRow("l2", "menu", 2, ["l0", "l1"], { title: "Level 2" }),
        createRow("l3", "menu", 3, ["l0", "l1", "l2"], { title: "Level 3" }),
    ];
    const ids = buildNavEntries(rows).map((entry) => entry.id);
    assert.deepStrictEqual(ids, ["l0", "l1", "l2"]);
}

function preservesRowOrder(): void {
    const rows = [
        createRow("b", "menu", 0, [], { title: "B" }),
        createRow("a", "menu", 0, [], { title: "A" }),
    ];
    const ids = buildNavEntries(rows).map((entry) => entry.id);
    assert.deepStrictEqual(ids, ["b", "a"], "sidebar order must follow the Kconfig order, not be sorted");
}

function fallsBackFromTitleToNameToId(): void {
    const rows = [
        createRow("with-title", "menu", 0, [], { title: "Titled", name: "NAMED" }),
        createRow("with-name", "menu", 0, [], { name: "NAMED_ONLY" }),
        createRow("bare-id", "menu", 0, []),
    ];
    const titles = buildNavEntries(rows).map((entry) => entry.title);
    assert.deepStrictEqual(titles, ["Titled", "NAMED_ONLY", "bare-id"]);
}

function carriesNavigationFields(): void {
    const row = createRow("child", "menu", 1, ["parent"], { title: "Child" });
    row.hasChildren = false;
    const [entry] = buildNavEntries([row]);
    assert.deepStrictEqual(entry, {
        id: "child",
        title: "Child",
        level: 1,
        ancestors: ["parent"],
        hasChildren: false,
    });
}

export async function runSectionNavigationTests(): Promise<void> {
    includesOnlyMenuRows();
    excludesMenusDeeperThanMaxDepth();
    preservesRowOrder();
    fallsBackFromTitleToNameToId();
    carriesNavigationFields();
    // eslint-disable-next-line no-console
    console.log("[Test] Section navigation tests passed");
}
