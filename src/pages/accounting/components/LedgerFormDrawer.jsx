import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../../components/ui/sheet";
import { Switch } from "../../../components/ui/switch";
import { Textarea } from "../../../components/ui/textarea";
import { ACCOUNT_STATUS, COA_TYPE, ERP_SOURCE_LABELS } from "../constants";
import { flattenLedgersFromTree } from "../utils/coaUtils";

const NO_PARENT = "__root__";
const ENTITY_LABELS = {
  [COA_TYPE.CATEGORY]: "Category",
  [COA_TYPE.GROUP]: "Group",
  [COA_TYPE.LEDGER]: "Ledger",
};

const blankForm = {
  erpSource: "",
  name: "",
  code: "",
  description: "",
  accountCategory: "",
  accountGroupType: "",
  parentId: NO_PARENT,
  active: true,
  createAsSubLedger: false,
  notes: "",
};

const findLastGroupName = (parents = []) => {
  for (let index = parents.length - 1; index >= 0; index -= 1) {
    if (parents[index]?.type === COA_TYPE.GROUP) return parents[index].name;
  }
  return undefined;
};

const collectNodes = (nodes = [], parents = []) =>
  nodes.flatMap((node) => {
    const row = {
      ...node,
      category: parents.find((parent) => parent.type === COA_TYPE.CATEGORY)?.name,
      group: findLastGroupName(parents),
    };
    return [row, ...collectNodes(node.children || [], [...parents, node])];
  });

const getNodePath = (node) =>
  [node.category, node.group, node.name].filter(Boolean).join(" > ") || node.name;

const LedgerFormDrawer = ({
  open,
  mode = "create",
  entityType = COA_TYPE.LEDGER,
  tree = [],
  connectedErp = [],
  ledger,
  onOpenChange,
  onSubmit,
  submitting = false,
}) => {
  const [form, setForm] = useState(blankForm);
  const isEdit = mode === "edit";
  const isCategory = entityType === COA_TYPE.CATEGORY;
  const isGroup = entityType === COA_TYPE.GROUP;
  const isLedger = entityType === COA_TYPE.LEDGER;
  const entityLabel = ENTITY_LABELS[entityType] || "Ledger";

  const allNodes = useMemo(() => collectNodes(tree), [tree]);
  const ledgers = useMemo(() => flattenLedgersFromTree(tree), [tree]);
  const categories = allNodes.filter((node) => node.type === COA_TYPE.CATEGORY);
  const parentOptions = allNodes.filter((node) => {
    if (node.id === ledger?.id) return false;
    if (isCategory) return false;
    if (isGroup) return [COA_TYPE.CATEGORY, COA_TYPE.GROUP].includes(node.type);
    return [COA_TYPE.CATEGORY, COA_TYPE.GROUP, COA_TYPE.LEDGER].includes(node.type);
  });
  const groupNames = Array.from(
    new Set(
      allNodes
        .filter((node) => node.type === COA_TYPE.GROUP)
        .map((node) => node.name)
        .filter(Boolean),
    ),
  );

  useEffect(() => {
    if (!open) return;
    if (isEdit && ledger) {
      setForm({
        erpSource: ledger.erpSource || connectedErp[0] || "",
        name: ledger.name || "",
        code: ledger.code || "",
        description: ledger.description || "",
        accountCategory:
          ledger.category ||
          (ledger.type === COA_TYPE.CATEGORY ? ledger.name : "") ||
          "",
        accountGroupType: ledger.parentGroup || ledger.ledgerType || "",
        parentId: ledger.parentId || NO_PARENT,
        active: (ledger.status || ACCOUNT_STATUS.ACTIVE) !== ACCOUNT_STATUS.INACTIVE,
        createAsSubLedger: Boolean(ledger.parentId),
        notes: ledger.notes || "",
      });
      return;
    }

    setForm({
      ...blankForm,
      erpSource: connectedErp[0] || "",
    });
  }, [connectedErp, isEdit, ledger, open]);

  const updateField = (key, value) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

  const selectedParent = parentOptions.find((node) => node.id === form.parentId);
  const duplicateSource = isLedger ? ledgers : allNodes.filter((node) => node.type === entityType);
  const duplicateName = duplicateSource.some((item) => {
    if (isEdit && item.id === ledger?.id) return false;
    const sameName = String(item.name || "").trim().toLowerCase() === form.name.trim().toLowerCase();
    if (!sameName) return false;
    return (item.parentId || NO_PARENT) === (form.parentId || NO_PARENT);
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const normalizedParentId = form.parentId === NO_PARENT ? null : form.parentId;
    onSubmit({
      erpSource: form.erpSource,
      entityType,
      name: form.name.trim(),
      code: form.code.trim() || null,
      description: form.description.trim() || null,
      accountCategory: form.accountCategory || null,
      accountGroupType: form.accountGroupType.trim() || null,
      parentId: normalizedParentId,
      parentType: selectedParent?.type || null,
      active: form.active,
      status: form.active ? ACCOUNT_STATUS.ACTIVE : ACCOUNT_STATUS.INACTIVE,
      createAsSubLedger: form.createAsSubLedger,
      notes: form.notes.trim() || null,
    });
  };

  const canSubmit =
    form.name.trim() &&
    !duplicateName &&
    (!isLedger || !form.createAsSubLedger || form.parentId !== NO_PARENT);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>{isEdit ? `Edit ${entityLabel}` : `Create ${entityLabel}`}</SheetTitle>
          <SheetDescription>
            Changes are sent to the connected ERP first, then COA is refreshed.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Basic Information</h3>
              <div className="space-y-2">
                <Label>ERP Source</Label>
                <Select
                  value={form.erpSource}
                  onValueChange={(value) => updateField("erpSource", value)}
                  disabled={isEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ERP source" />
                  </SelectTrigger>
                  <SelectContent>
                    {(connectedErp.length ? connectedErp : [form.erpSource].filter(Boolean)).map((source) => (
                      <SelectItem key={source} value={source}>
                        {ERP_SOURCE_LABELS[source] || source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{entityLabel} Name *</Label>
                <Input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder={
                    isCategory
                      ? "e.g. Expense"
                      : isGroup
                        ? "e.g. Direct Expenses"
                        : "e.g. Raw Materials"
                  }
                  required
                />
                {duplicateName ? (
                  <p className="text-xs text-destructive">
                    A {entityLabel.toLowerCase()} with this name already exists under the selected parent.
                  </p>
                ) : null}
              </div>
              {isLedger ? (
                <div className="space-y-2">
                  <Label>Ledger Code</Label>
                  <Input
                    value={form.code}
                    onChange={(event) => updateField("code", event.target.value)}
                    placeholder="Optional ledger code"
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
            </section>

            {!isCategory ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Accounting Structure</h3>
              <div className="space-y-2">
                <Label>Account Category</Label>
                <Select
                  value={form.accountCategory}
                  onValueChange={(value) => updateField("accountCategory", value)}
                  disabled={isEdit && isLedger}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isLedger ? (
                <div className="space-y-2">
                  <Label>Account Group / Type</Label>
                  <Input
                    value={form.accountGroupType}
                    onChange={(event) => updateField("accountGroupType", event.target.value)}
                    placeholder={groupNames[0] || "ERP-specific group/type"}
                    list="coa-ledger-group-options"
                    disabled={isEdit}
                  />
                  <datalist id="coa-ledger-group-options">
                    {groupNames.map((group) => (
                      <option key={group} value={group} />
                    ))}
                  </datalist>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>{isGroup ? "Parent Category / Group" : "Parent Account"}</Label>
                <Select
                  value={form.parentId}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      parentId: value,
                      createAsSubLedger: value !== NO_PARENT,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isGroup ? "Root group" : "Root ledger"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARENT}>
                      {isGroup ? "Root group" : "Root ledger"}
                    </SelectItem>
                    {parentOptions.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {getNodePath(node)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>
            ) : null}

            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Additional Options</h3>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Inactive ledgers remain visible but unavailable.</p>
                </div>
                <Switch
                  checked={form.active}
                  onCheckedChange={(value) => updateField("active", value)}
                />
              </div>
              {!isEdit && isLedger ? (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label>Create as Sub-ledger</Label>
                    <p className="text-xs text-muted-foreground">Requires a parent account.</p>
                  </div>
                  <Switch
                    checked={form.createAsSubLedger}
                    onCheckedChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        createAsSubLedger: value,
                        parentId: value ? prev.parentId : NO_PARENT,
                      }))
                    }
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  placeholder="Optional notes for ERP/user context"
                  rows={3}
                />
              </div>
            </section>

            {isEdit ? (
              <section className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Read-only ERP fields</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <span>{entityLabel} ID: {ledger?.erpId || ledger?.id || "—"}</span>
                  <span>Category: {ledger?.category || form.accountCategory || "—"}</span>
                  <span>Created Date: {ledger?.createdAt || "—"}</span>
                  <span>ERP Source: {ERP_SOURCE_LABELS[form.erpSource] || form.erpSource || "—"}</span>
                </div>
              </section>
            ) : null}
          </div>

          <SheetFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? `Update ${entityLabel}` : `Create ${entityLabel}`}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default LedgerFormDrawer;
