import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "../../../lib/utils";
import { COA_TYPE } from "../constants";

const typeDotClass = {
  [COA_TYPE.CATEGORY]: "bg-violet-600",
  [COA_TYPE.GROUP]: "bg-blue-500",
  [COA_TYPE.LEDGER]: "bg-emerald-500",
};

const typeLabel = {
  [COA_TYPE.CATEGORY]: "Category",
  [COA_TYPE.GROUP]: "Group",
  [COA_TYPE.LEDGER]: "Ledger",
};

const TreeNode = ({ node, depth, selectedId, expandedIds, onToggle, onSelect }) => {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const kind = node.type || COA_TYPE.LEDGER;

  return (
    <div>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-1.5 border-l-2 border-transparent py-1.5 pr-3 text-left text-sm transition-colors hover:bg-muted/70",
          isSelected && "border-l-primary bg-primary/10 text-primary",
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => {
          if (hasChildren) onToggle(node.id);
          onSelect(node);
        }}
        data-testid={`coa-tree-node-${node.id}`}
        title={`${typeLabel[kind] || kind}: ${node.name}`}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="inline-block w-3.5 shrink-0" />
        )}
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            typeDotClass[kind] || "bg-muted-foreground",
          )}
        />
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            isSelected || kind === COA_TYPE.CATEGORY ? "font-semibold" : "font-normal",
          )}
        >
          {node.name}
        </span>
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
          {typeLabel[kind] || kind}
        </span>
        {node.code ? (
          <span className="shrink-0 text-[11px] text-muted-foreground">{node.code}</span>
        ) : null}
      </button>
      {hasChildren && isExpanded
        ? node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  );
};

const CoaTreePanel = ({ tree = [], selectedId, onSelect, autoExpand = false }) => {
  const defaultExpandedIds = useMemo(() => {
    if (!autoExpand) return [];

    const ids = [];
    const walk = (nodes, depth = 0) => {
      nodes.forEach((node) => {
        if (node.children?.length) {
          ids.push(node.id);
          walk(node.children, depth + 1);
        }
      });
    };
    walk(tree);
    return ids;
  }, [autoExpand, tree]);

  const [expandedIds, setExpandedIds] = useState(() => new Set(defaultExpandedIds));

  useEffect(() => {
    setExpandedIds(new Set(defaultExpandedIds));
  }, [defaultExpandedIds]);

  const onToggle = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!tree.length) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        No accounts match the current search.
      </div>
    );
  }

  return (
    <div className="py-2" data-testid="coa-tree-panel">
      <div className="mb-2 flex flex-wrap gap-3 px-3 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-violet-600" /> Category
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> Group
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Ledger
        </span>
      </div>
      {tree.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          expandedIds={expandedIds}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

export default CoaTreePanel;
