---
name: react-flow-architect
description: Build production-ready ReactFlow applications with hierarchical navigation, performance optimization, and advanced state management. Use when the task involves react flow architect.
risk: unknown
source: community
date_added: "2026-02-27"
---

# ReactFlow Architect

Build production-ready ReactFlow applications with hierarchical navigation, performance optimization, and advanced state management.

## Quick Start

Create basic interactive graph:

```tsx
import ReactFlow, { Node, Edge } from "reactflow";

const nodes: Node[] = [
  { id: "1", position: { x: 0, y: 0 }, data: { label: "Node 1" } },
  { id: "2", position: { x: 100, y: 100 }, data: { label: "Node 2" } },
];

const edges: Edge[] = [{ id: "e1-2", source: "1", target: "2" }];

export default function Graph() {
  return <ReactFlow nodes={nodes} edges={edges} />;
}
```

## Core Patterns

### Hierarchical Tree Navigation

Build expandable/collapsible tree structures with parent-child relationships.

#### Node Schema

```typescript
interface TreeNode extends Node {
  data: {
    label: string;
    level: number;
    hasChildren: boolean;
    isExpanded: boolean;
    childCount: number;
    category: "root" | "category" | "process" | "detail";
  };
}
```

#### Incremental Node Building

> See [references/details.md](references/details.md) for full code examples.

### Performance Optimization

Handle large datasets with incremental rendering and memoization.

#### Incremental Rendering

> See [references/details.md](references/details.md) for full code examples.

#### Memoization Patterns

> See [references/details.md](references/details.md) for full code examples.

### State Management

Complex node/edge state patterns with undo/redo and persistence.

#### Reducer Pattern

> See [references/details.md](references/details.md) for full code examples.

#### History Management

> See [references/details.md](references/details.md) for full code examples.

## Advanced Features

### Auto-Layout Integration

Integrate Dagre for automatic graph layout:

> See [references/details.md](references/details.md) for full code examples.

### Focus Mode

Isolate selected nodes and their direct connections:

> See [references/details.md](references/details.md) for full code examples.

### Search Integration

Search and navigate to specific nodes:

> See [references/details.md](references/details.md) for full code examples.

## Performance Tools

### Graph Performance Analyzer

Create a performance analysis script:

> See [references/details.md](references/details.md) for full code examples.

## Best Practices

### Performance Guidelines

1. **Use React.memo** for node components to prevent unnecessary re-renders
2. **Implement virtualization** for graphs with 1000+ nodes
3. **Debounce layout calculations** during rapid interactions
4. **Use useCallback** for edge creation and manipulation functions
5. **Implement proper TypeScript types** for nodes and edges

### Memory Management

```typescript
// Use Map for O(1) lookups instead of array.find
const nodesById = useMemo(
  () => new Map(allNodes.map((n) => [n.id, n])),
  [allNodes],
);

// Cache layout results
const layoutCacheRef = useRef<Map<string, Node[]>>(new Map());

// Proper cleanup in useEffect
useEffect(() => {
  return () => {
    // Clean up any lingering references
    nodesMapRef.current.clear();
    edgesMapRef.current.clear();
  };
}, []);
```

### State Optimization

```typescript
// Use useRef for objects that shouldn't trigger re-renders
const autoSaveDataRef = useRef({
  nodes: [],
  edges: [],
  lastSaved: Date.now(),
});

// Update properties without breaking reference
const updateAutoSaveData = (newNodes: Node[], newEdges: Edge[]) => {
  autoSaveDataRef.current.nodes = newNodes;
  autoSaveDataRef.current.edges = newEdges;
  autoSaveDataRef.current.lastSaved = Date.now();
};
> See [references/details.md](references/details.md) for full code examples.
import React, { useState, useCallback, useMemo, useRef } from 'react';
import ReactFlow, { Node, Edge, useReactFlow } from 'reactflow';
import dagre from 'dagre';
import { debounce } from 'lodash';

interface GraphState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  expandedNodeIds: Set<string>;
  history: GraphState[];
  historyIndex: number;
}

export default function InteractiveGraph() {
  const [state, setState] = useState<GraphState>({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    expandedNodeIds: new Set(),
    history: [],
    historyIndex: 0,
  });

  const { fitView } = useReactFlow();
  const layoutCacheRef = useRef<Map<string, Node[]>>(new Map());

  // Memoized styled edges
  const styledEdges = useMemo(() => {
    return state.edges.map(edge => ({
      ...edge,
      style: {
        ...edge.style,
        strokeWidth: state.selectedNodeId === edge.source || state.selectedNodeId === edge.target ? 3 : 2,
        stroke: state.selectedNodeId === edge.source || state.selectedNodeId === edge.target ? '#3b82f6' : '#94a3b8',
      },
      animated: state.selectedNodeId === edge.source || state.selectedNodeId === edge.target,
    }));
  }, [state.edges, state.selectedNodeId]);

  // Debounced layout calculation
  const debouncedLayout = useMemo(
    () => debounce((nodes: Node[], edges: Edge[]) => {
      const cacheKey = generateLayoutCacheKey(nodes, edges);

      if (layoutCacheRef.current.has(cacheKey)) {
        return layoutCacheRef.current.get(cacheKey)!;
      }

      const layouted = applyDagreLayout(nodes, edges);
      layoutCacheRef.current.set(cacheKey, layouted);

      return layouted;
    }, 150),
    []
  );

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setState(prev => ({
      ...prev,
      selectedNodeId: node.id,
    }));
  }, []);

  const handleToggleExpand = useCallback((nodeId: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedNodeIds);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }

      return {
        ...prev,
        expandedNodeIds: newExpanded,
      };
    });
  }, []);

  return (
    <ReactFlow
      nodes={state.nodes}
      edges={styledEdges}
      onNodeClick={handleNodeClick}
      fitView
    />
  );
}
```

This comprehensive skill provides everything needed to build production-ready ReactFlow applications with hierarchical navigation, performance optimization, and advanced state management patterns.

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
