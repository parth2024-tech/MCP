# React Flow Architect — Code Reference

## #### Incremental Node Building

```typescript
const buildVisibleNodes = useCallback(
  (allNodes: TreeNode[], expandedIds: Set<string>, otherDeps: any[]) => {
    const visibleNodes = new Map<string, TreeNode>();
    const visibleEdges = new Map<string, TreeEdge>();

    // Start with root nodes
    const rootNodes = allNodes.filter((n) => n.data.level === 0);

    // Recursively add visible nodes
    const addVisibleChildren = (node: TreeNode) => {
      visibleNodes.set(node.id, node);

      if (expandedIds.has(node.id)) {
        const children = allNodes.filter((n) => n.parentNode === node.id);
        children.forEach((child) => addVisibleChildren(child));
      }
    };

    rootNodes.forEach((root) => addVisibleChildren(root));

    return {
      nodes: Array.from(visibleNodes.values()),
      edges: Array.from(visibleEdges.values()),
    };
  },
  [],
);
```


## #### Incremental Rendering

```typescript
const useIncrementalGraph = (
  allNodes: Node[],
  allEdges: Edge[],
  expandedList: string[],
) => {
  const prevExpandedListRef = useRef<Set<string>>(new Set());
  const prevOtherDepsRef = useRef<any[]>([]);

  const { visibleNodes, visibleEdges } = useMemo(() => {
    const currentExpandedSet = new Set(expandedList);
    const prevExpandedSet = prevExpandedListRef.current;

    // Check if expanded list changed
    const expandedChanged = !areSetsEqual(currentExpandedSet, prevExpandedSet);

    // Check if other dependencies changed
    const otherDepsChanged = !arraysEqual(otherDeps, prevOtherDepsRef.current);

    if (expandedChanged && !otherDepsChanged) {
      // Only expanded list changed - incremental update
      return buildIncrementalUpdate(
        cachedVisibleNodesRef.current,
        cachedVisibleEdgesRef.current,
        allNodes,
        allEdges,
        currentExpandedSet,
        prevExpandedSet,
      );
    } else {
      // Full rebuild needed
      return buildFullGraph(allNodes, allEdges, currentExpandedSet);
    }
  }, [allNodes, allEdges, expandedList, ...otherDeps]);

  return { visibleNodes, visibleEdges };
};
```


## #### Memoization Patterns

```typescript
// Memoize node components to prevent unnecessary re-renders
const ProcessNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className={`process-node ${selected ? 'selected' : ''}`}>
      {data.label}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  return (
    prevProps.data.label === nextProps.data.label &&
    prevProps.selected === nextProps.selected &&
    prevProps.data.isExpanded === nextProps.data.isExpanded
  );
});

// Memoize edge calculations
const styledEdges = useMemo(() => {
  return edges.map(edge => ({
    ...edge,
    style: {
      ...edge.style,
      strokeWidth: selectedEdgeId === edge.id ? 3 : 2,
      stroke: selectedEdgeId === edge.id ? '#3b82f6' : '#94a3b8',
    },
    animated: selectedEdgeId === edge.id,
  }));
}, [edges, selectedEdgeId]);
```


## #### Reducer Pattern

```typescript
type GraphAction =
  | { type: "SELECT_NODE"; payload: string }
  | { type: "SELECT_EDGE"; payload: string }
  | { type: "TOGGLE_EXPAND"; payload: string }
  | { type: "UPDATE_NODES"; payload: Node[] }
  | { type: "UPDATE_EDGES"; payload: Edge[] }
  | { type: "UNDO" }
  | { type: "REDO" };

const graphReducer = (state: GraphState, action: GraphAction): GraphState => {
  switch (action.type) {
    case "SELECT_NODE":
      return {
        ...state,
        selectedNodeId: action.payload,
        selectedEdgeId: null,
      };

    case "TOGGLE_EXPAND":
      const newExpanded = new Set(state.expandedNodeIds);
      if (newExpanded.has(action.payload)) {
        newExpanded.delete(action.payload);
      } else {
        newExpanded.add(action.payload);
      }
      return {
        ...state,
        expandedNodeIds: newExpanded,
        isDirty: true,
      };

    default:
      return state;
  }
};
```


## #### History Management

```typescript
const useHistoryManager = (
  state: GraphState,
  dispatch: Dispatch<GraphAction>,
) => {
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  const undo = useCallback(() => {
    if (canUndo) {
      const newIndex = state.historyIndex - 1;
      const historyEntry = state.history[newIndex];

      dispatch({
        type: "RESTORE_FROM_HISTORY",
        payload: {
          ...historyEntry,
          historyIndex: newIndex,
        },
      });
    }
  }, [canUndo, state.historyIndex, state.history]);

  const saveToHistory = useCallback(() => {
    dispatch({ type: "SAVE_TO_HISTORY" });
  }, [dispatch]);

  return { canUndo, canRedo, undo, redo, saveToHistory };
};
```


## ### Auto-Layout Integration

```typescript
import dagre from "dagre";

const layoutOptions = {
  rankdir: "TB", // Top to Bottom
  nodesep: 100, // Node separation
  ranksep: 150, // Rank separation
  marginx: 50,
  marginy: 50,
  edgesep: 10,
};

const applyLayout = (nodes: Node[], edges: Edge[]) => {
  const g = new dagre.graphlib.Graph();
  g.setGraph(layoutOptions);
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to graph
  nodes.forEach((node) => {
    g.setNode(node.id, { width: 200, height: 100 });
  });

  // Add edges to graph
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(g);

  // Apply positions
  return nodes.map((node) => ({
    ...node,
    position: {
      x: g.node(node.id).x - 100,
      y: g.node(node.id).y - 50,
    },
  }));
};

// Debounce layout calculations
const debouncedLayout = useMemo(() => debounce(applyLayout, 150), []);
```


## ### Focus Mode

```typescript
const useFocusMode = (
  selectedNodeId: string,
  allNodes: Node[],
  allEdges: Edge[],
) => {
  return useMemo(() => {
    if (!selectedNodeId) return { nodes: allNodes, edges: allEdges };

    // Get direct connections
    const connectedNodeIds = new Set([selectedNodeId]);
    const focusedEdges: Edge[] = [];

    allEdges.forEach((edge) => {
      if (edge.source === selectedNodeId || edge.target === selectedNodeId) {
        focusedEdges.push(edge);
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
      }
    });

    // Get connected nodes
    const focusedNodes = allNodes.filter((n) => connectedNodeIds.has(n.id));

    return { nodes: focusedNodes, edges: focusedEdges };
  }, [selectedNodeId, allNodes, allEdges]);
};

// Smooth transitions for focus mode
const focusModeStyles = {
  transition: "all 0.3s ease-in-out",
  opacity: isInFocus ? 1 : 0.3,
  filter: isInFocus ? "none" : "blur(2px)",
};
```


## ### Search Integration

```typescript
const searchNodes = useCallback((nodes: Node[], query: string) => {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();
  return nodes.filter(
    (node) =>
      node.data.label.toLowerCase().includes(lowerQuery) ||
      node.data.description?.toLowerCase().includes(lowerQuery),
  );
}, []);

const navigateToSearchResult = (nodeId: string) => {
  // Expand parent nodes
  const nodePath = calculateBreadcrumbPath(nodeId, allNodes);
  const parentIds = nodePath.slice(0, -1).map((n) => n.id);

  setExpandedIds((prev) => new Set([...prev, ...parentIds]));
  setSelectedNodeId(nodeId);

  // Fit view to node
  fitView({ nodes: [{ id: nodeId }], duration: 800 });
};
```


## ### Graph Performance Analyzer

```javascript
// scripts/graph-analyzer.js
class GraphAnalyzer {
  analyzeCode(content, filePath) {
    const analysis = {
      metrics: {
        nodeCount: this.countNodes(content),
        edgeCount: this.countEdges(content),
        renderTime: this.estimateRenderTime(content),
        memoryUsage: this.estimateMemoryUsage(content),
        complexity: this.calculateComplexity(content),
      },
      issues: [],
      optimizations: [],
      patterns: this.detectPatterns(content),
    };

    // Detect performance issues
    this.detectPerformanceIssues(analysis);

    // Suggest optimizations
    this.suggestOptimizations(analysis);

    return analysis;
  }

  countNodes(content) {
    const nodePatterns = [
      /nodes:/s*\[.*?\]/gs,
      /const/s+/w+/s*=/s*\[.*?id:.*?position:/gs,
    ];

    let totalCount = 0;
    nodePatterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          const nodeMatches = match.match(/id:/s*['"`][^'"`]+['"`]/g);
          if (nodeMatches) {
            totalCount += nodeMatches.length;
          }
        });
      }
    });

    return totalCount;
  }

  estimateRenderTime(content) {
    const nodeCount = this.countNodes(content);
    const edgeCount = this.countEdges(content);

    // Base render time estimation (ms)
    const baseTime = 5;
    const nodeTime = nodeCount * 0.1;
    const edgeTime = edgeCount * 0.05;

    return baseTime + nodeTime + edgeTime;
  }

  detectPerformanceIssues(analysis) {
    const { metrics } = analysis;

    if (metrics.nodeCount > 500) {
      analysis.issues.push({
        type: "HIGH_NODE_COUNT",
        severity: "high",
        message: `Too many nodes (${metrics.nodeCount}). Consider virtualization.`,
        suggestion: "Implement virtualization or reduce visible nodes",
      });
    }

    if (metrics.renderTime > 16) {
      analysis.issues.push({
        type: "SLOW_RENDER",
        severity: "high",
        message: `Render time (${metrics.renderTime.toFixed(2)}ms) exceeds 60fps.`,
        suggestion: "Optimize with memoization and incremental rendering",
      });
    }
  }
}
```


## ### State Optimization

```

## Common Problems & Solutions

### Performance Issues

- **Problem**: Lag during node expansion
- **Solution**: Implement incremental rendering with change detection

- **Problem**: Memory usage increases over time
- **Solution**: Proper cleanup in useEffect hooks and use WeakMap for temporary data

### Layout Conflicts

- **Problem**: Manual positioning conflicts with auto-layout
- **Solution**: Use controlled positioning state and separate layout modes

### Rendering Issues

- **Problem**: Excessive re-renders
- **Solution**: Use memo, useMemo, and useCallback with stable dependencies

- **Problem**: Slow layout calculations
- **Solution**: Debounce layout calculations and cache results

## Complete Example

```typescript


