import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  Circle,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";

const buildChecklist = (formData) => {
  if (!formData) return [];

  const validLineItems = (formData.line_items || []).filter(
    (item) => item.description?.trim() && Number(item.unit_rate) > 0,
  );
  const allLineItemsValid =
    (formData.line_items || []).length > 0 &&
    (formData.line_items || []).every(
      (item) => item.description?.trim() && Number(item.unit_rate) > 0,
    );

  return [
    {
      group: "Vendor",
      items: [
        {
          label: "Vendor name",
          done: !!formData.vendor_name?.trim(),
        },
        {
          label: "Vendor matched in system",
          done: !!formData.vendor_matched,
          optional: true,
          warn: !!formData.vendor_name?.trim() && !formData.vendor_matched,
        },
      ],
    },
    {
      group: "Invoice details",
      items: [
        { label: "Bill number", done: !!formData.invoice_number?.trim() },
        { label: "Billing date", done: !!formData.invoice_date },
        { label: "Due date", done: !!formData.due_date },
        {
          label: "Department",
          done: !!formData.department_id,
        },
      ],
    },
    {
      group: "Tax & compliance",
      items: [
        { label: "GST treatment", done: !!formData.gst_treatment },
        { label: "GSTIN", done: !!formData.gstin?.trim() },
        { label: "Source of supply", done: !!formData.source_of_supply },
        { label: "Destination", done: !!formData.destination_of_supply },
        { label: "Location", done: !!formData.location?.trim() },
      ],
    },
    {
      group: "Categorisation",
      items: [
        { label: "File category", done: !!formData.file_category },
        { label: "Source", done: !!formData.source },
        {
          label: "Source email",
          done: !!formData.source_email?.trim(),
          hidden: formData.source !== "Email",
        },
      ],
    },
    {
      group: "Line items",
      items: [
        {
          label:
            validLineItems.length === 0
              ? "At least one line item required"
              : `${validLineItems.length} of ${formData.line_items.length} item${formData.line_items.length !== 1 ? "s" : ""} complete`,
          done: allLineItemsValid,
        },
      ],
    },
  ];
};

export const InvoiceChecklist = ({ formData }) => {
  const [open, setOpen] = useState(true);

  const groups = useMemo(() => buildChecklist(formData), [formData]);

  const allItems = groups.flatMap((g) =>
    g.items.filter((i) => !i.hidden && !i.optional),
  );
  const doneCount = allItems.filter((i) => i.done).length;
  const totalCount = allItems.length;
  const allDone = doneCount === totalCount;
  const warnItems = groups
    .flatMap((g) => g.items)
    .filter((i) => i.warn && !i.hidden);
  const hasWarnings = warnItems.length > 0;

  const pct = Math.round((doneCount / totalCount) * 100);

  return (
    <>
      <div
        style={{
          position: "sticky",
          bottom: "0px",
          zIndex: 40,
          display: "flex",
          justifyContent: "flex-end",
          pointerEvents: "none",
          marginRight: "-8px",
        }}
      >
        <div style={{ pointerEvents: "auto" }} className="flex flex-col gap-1 justify-end items-end">
          {open && (
            <div
              style={{
                width: "272px",
                background: "var(--color-background-primary, #fff)",
                border: "0.5px solid var(--color-border-secondary, #e2e8f0)",
                borderRadius: "12px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
                marginBottom: "8px",
                overflow: "hidden",
                animation: "cl-slide-up 0.18s ease",
              }}
            >
              <div
                style={{
                  padding: "10px 14px 8px",
                  borderBottom:
                    "0.5px solid var(--color-border-tertiary, #f0f0f0)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--color-text-primary)",
                  }}
                >
                  Form checklist
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: allDone
                      ? "var(--color-text-success, #16a34a)"
                      : "var(--color-text-secondary)",
                  }}
                >
                  {doneCount}/{totalCount} complete
                </span>
              </div>

              <div
                style={{
                  height: "3px",
                  background: "var(--color-background-tertiary, #f5f5f5)",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: allDone
                      ? "var(--color-background-success, #16a34a)"
                      : "var(--color-background-info, #3b82f6)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>

              <div
                style={{
                  maxHeight: "340px",
                  overflowY: "auto",
                  padding: "8px 0",
                }}
              >
                {groups.map((group) => {
                  const visibleItems = group.items.filter((i) => !i.hidden);
                  if (visibleItems.length === 0) return null;
                  return (
                    <div key={group.group} style={{ marginBottom: "4px" }}>
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 500,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "var(--color-text-tertiary)",
                          padding: "4px 14px 2px",
                        }}
                      >
                        {group.group}
                      </div>
                      {visibleItems.map((item) => (
                        <div
                          key={item.label}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "3px 14px",
                          }}
                        >
                          {item.warn ? (
                            <AlertCircle
                              style={{
                                width: "13px",
                                height: "13px",
                                flexShrink: 0,
                                color: "#d97706",
                              }}
                            />
                          ) : item.done ? (
                            <CheckCircle2
                              style={{
                                width: "13px",
                                height: "13px",
                                flexShrink: 0,
                                color: "var(--color-text-success, #16a34a)",
                              }}
                            />
                          ) : (
                            <Circle
                              style={{
                                width: "13px",
                                height: "13px",
                                flexShrink: 0,
                                color: "var(--color-border-secondary, #cbd5e1)",
                              }}
                            />
                          )}
                          <span
                            style={{
                              fontSize: "12px",
                              color: item.warn
                                ? "#92400e"
                                : item.done
                                  ? "var(--color-text-primary)"
                                  : "var(--color-text-secondary)",
                              textDecoration:
                                item.done && !item.warn ? "none" : "none",
                            }}
                          >
                            {item.label}
                            {item.optional && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  marginLeft: "4px",
                                  color: "var(--color-text-tertiary)",
                                }}
                              >
                                (warning)
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="max-w-min"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "7px 12px",
              borderRadius: "99px",
              border: `1.5px solid ${
                allDone
                  ? "var(--color-border-success, #16a34a)"
                  : hasWarnings
                    ? "#d97706"
                    : "var(--color-border-secondary, #e2e8f0)"
              }`,
              background: allDone
                ? "var(--color-background-success, #f0fdf4)"
                : "var(--color-background-primary, #fff)",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              transition: "box-shadow 0.15s",
            }}
          >
            <ClipboardList
              style={{
                width: "14px",
                height: "14px",
                color: allDone
                  ? "var(--color-text-success, #16a34a)"
                  : "var(--color-text-secondary)",
              }}
            />
            <span
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: allDone
                  ? "var(--color-text-success, #16a34a)"
                  : "var(--color-text-primary)",
              }}
            >
              {doneCount}/{totalCount}
            </span>
            {hasWarnings && !allDone && (
              <AlertCircle
                style={{ width: "13px", height: "13px", color: "#d97706" }}
              />
            )}
            {open ? (
              <ChevronDown
                style={{
                  width: "13px",
                  height: "13px",
                  color: "var(--color-text-secondary)",
                }}
              />
            ) : (
              <ChevronUp
                style={{
                  width: "13px",
                  height: "13px",
                  color: "var(--color-text-secondary)",
                }}
              />
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cl-slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default InvoiceChecklist;
