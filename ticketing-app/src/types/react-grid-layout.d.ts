declare module "react-grid-layout" {
  import * as React from "react";

  export interface Layout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    maxW?: number;
    minH?: number;
    maxH?: number;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
    resizeHandles?: Array<"s" | "w" | "e" | "n" | "sw" | "nw" | "se" | "ne">;
    isBounded?: boolean;
  }

  export type Layouts = { [key: string]: Layout[] };

  export interface CoreProps {
    className?: string;
    style?: React.CSSProperties;
    width?: number;
    autoSize?: boolean;
    cols?: number;
    draggableHandle?: string;
    draggableCancel?: string;
    containerPadding?: [number, number];
    rowHeight?: number;
    maxRows?: number;
    layout?: Layout[];
    margin?: [number, number];
    isDraggable?: boolean;
    isResizable?: boolean;
    isDroppable?: boolean;
    preventCollision?: boolean;
    useCSSTransforms?: boolean;
    transformScale?: number;
    verticalCompact?: boolean;
    compactType?: "vertical" | "horizontal" | null;
    onLayoutChange?: (layout: Layout[]) => void;
    onDragStart?: (
      layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      placeholder: Layout,
      event: MouseEvent,
      element: HTMLElement,
    ) => void;
    onDrag?: (
      layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      placeholder: Layout,
      event: MouseEvent,
      element: HTMLElement,
    ) => void;
    onDragStop?: (
      layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      placeholder: Layout,
      event: MouseEvent,
      element: HTMLElement,
    ) => void;
    onResizeStart?: (
      layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      placeholder: Layout,
      event: MouseEvent,
      element: HTMLElement,
    ) => void;
    onResize?: (
      layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      placeholder: Layout,
      event: MouseEvent,
      element: HTMLElement,
    ) => void;
    onResizeStop?: (
      layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      placeholder: Layout,
      event: MouseEvent,
      element: HTMLElement,
    ) => void;
    onDrop?: (layout: Layout[], item: Layout, event: Event) => void;
    children?: React.ReactNode;
  }

  export interface ResponsiveProps extends CoreProps {
    breakpoints?: { lg?: number; md?: number; sm?: number; xs?: number; xxs?: number };
    cols?: { lg?: number; md?: number; sm?: number; xs?: number; xxs?: number };
    layouts?: Layouts;
    onBreakpointChange?: (breakpoint: string, cols: number) => void;
    onLayoutChange?: (layout: Layout[], layouts: Layouts) => void;
    onWidthChange?: (
      containerWidth: number,
      margin: [number, number],
      cols: number,
      containerPadding: [number, number],
    ) => void;
  }

  export class Responsive extends React.Component<ResponsiveProps> {}
  export class RGL extends React.Component<CoreProps> {}

  export function WidthProvider<P extends object>(
    ComposedComponent: React.ComponentType<P>,
  ): React.ComponentType<Omit<P, "width">>;
}
