import type { Menu } from "../../../../menuconfig/Menu";

export type RowType =
  | "menu"
  | "bool"
  | "tristate"
  | "string"
  | "int"
  | "hex"
  | "choice"
  | "comment"
  | "other";

export interface DisplayRow {
  id: string;
  item: Menu;
  level: number;
  type: RowType;
  ancestors: string[];
  collapsed: boolean;
  hidden: boolean;
  hasChildren: boolean;
}

export interface NavEntry {
  id: string;
  title: string;
  level: number;
  ancestors: string[];
  hasChildren: boolean;
}
