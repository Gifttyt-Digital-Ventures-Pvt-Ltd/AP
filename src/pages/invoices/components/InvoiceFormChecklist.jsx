import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ClipboardList,
} from "lucide-react";
import { DEFAULT_CURRENCY } from "../../../utils/currency";
import { isInrInvoiceCurrency } from "../utils/invoiceTax";

export const buildInvoiceFormChecklist = (
  formData,
  {
    departmentMandatory = false,
    categoryMandatory = false,
    showCategoryField = true,
  } = {},
) => {
  if (!formData) return [];

  const item = ({
    label,
    done,
    optional = false,
    hint,
    hidden = false,
    warn,
  }) => ({
    label,
    done,
    optional,
    hint,
    hidden,
    warn: warn !== undefined ? warn : !optional && !done,
  });

  const validLineItems = (formData.line_items || []).filter(
    (item) => item.description?.trim() && Number(item.unit_rate) > 0,
  );
  const allLineItemsValid =
    (formData.line_items || []).length > 0 &&
    (formData.line_items || []).every(
      (item) => item.description?.trim() && Number(item.unit_rate) > 0,
    );

  const hasVendorName = !!formData.vendor_name?.trim();
  const vendorUnmatched =
    hasVendorName &&
    !formData.vendor_matched &&
    !formData.vendor_request_submitted;
  const vendorResolved =
    !!formData.vendor_matched || !!formData.vendor_request_submitted;

  const vendorChecklistItems = [
    item({
      label: "Vendor name",
      done: hasVendorName,
    }),
  ];

  if (vendorUnmatched) {
    vendorChecklistItems.push(
      item({
        label: "Vendor does not match",
        done: false,
        warn: true,
      }),
    );
  } else if (hasVendorName) {
    vendorChecklistItems.push(
      item({
        label: "Vendor matched in system",
        done: vendorResolved,
        optional: true,
        hint: "warning",
      }),
    );
  }

  return [
    {
      group: "Vendor",
      items: vendorChecklistItems,
    },
    {
      group: "Invoice details",
      items: [
        item({ label: "Bill number", done: !!formData.invoice_number?.trim() }),
        item({ label: "Billing date", done: !!formData.invoice_date }),
        item({ label: "Due date", done: !!formData.due_date }),
        item({
          label: "Currency",
          done: !!(formData.currency || DEFAULT_CURRENCY).trim(),
        }),
        item({
          label: "Department",
          done: !!formData.department_id,
          optional: !departmentMandatory,
          hint: departmentMandatory ? "required" : "optional",
        }),
        item({
          label: "Category",
          done: !!(formData.category_id || formData.category?.id),
          optional: !categoryMandatory,
          hint: categoryMandatory ? "required" : "optional",
          hidden: !showCategoryField,
        }),
      ],
    },
    {
      group: "Tax & compliance",
      items: [
        item({ label: "GST treatment", done: !!formData.gst_treatment }),
        item({
          label: isInrInvoiceCurrency(formData.currency) ? "GSTIN" : "GSTIN / Tax ID",
          done: !!formData.gstin?.trim(),
          optional:
            !isInrInvoiceCurrency(formData.currency) ||
            formData.gst_treatment === "N/A",
          hint:
            isInrInvoiceCurrency(formData.currency) &&
            formData.gst_treatment !== "N/A"
              ? "required"
              : "optional",
        }),
        item({
          label: "Source of supply",
          done: !!String(formData.source_of_supply ?? "").trim(),
          hint: "required",
        }),
        item({
          label: "Destination",
          done: !!String(formData.destination_of_supply ?? "").trim(),
          hint: "required",
        }),
      ],
    },
    {
      group: "Source",
      items: [
        item({ label: "Source", done: !!formData.source }),
        item({
          label: "Source email",
          done: !!formData.source_email?.trim(),
          hidden: formData.source !== "Email",
        }),
      ],
    },
    {
      group: "Line items",
      items: [
        item({
          label:
            validLineItems.length === 0
              ? "At least one line item required"
              : `${validLineItems.length} of ${formData.line_items.length} item${formData.line_items.length !== 1 ? "s" : ""} complete`,
          done: allLineItemsValid,
        }),
      ],
    },
  ];
};

export const InvoiceChecklist = ({
  formData,
  departmentMandatory = false,
  categoryMandatory = false,
  showCategoryField = true,
}) => {
  const [open, setOpen] = useState(true);

  const groups = useMemo(
    () =>
      buildInvoiceFormChecklist(formData, {
        departmentMandatory,
        categoryMandatory,
        showCategoryField,
      }),
    [formData, departmentMandatory, categoryMandatory, showCategoryField],
  );

  const allItems = groups.flatMap((group) =>
    group.items.filter((item) => !item.hidden && !item.optional),
  );
  const doneCount = allItems.filter((item) => item.done).length;
  const totalCount = allItems.length;
  const allDone = totalCount > 0 && doneCount === totalCount;
  const warnItems = groups
    .flatMap((group) => group.items)
    .filter((item) => item.warn && !item.hidden);
  const hasWarnings = warnItems.length > 0;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

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
        <div
          style={{ pointerEvents: "auto" }}
          className="flex flex-col gap-1 justify-end items-end"
        >
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
                  const visibleItems = group.items.filter((item) => !item.hidden);
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
                            }}
                          >
                            {item.label}
                            {item.hint ? (
                              <span
                                style={{
                                  fontSize: "10px",
                                  marginLeft: "4px",
                                  color: "var(--color-text-tertiary)",
                                }}
                              >
                                ({item.hint})
                              </span>
                            ) : null}
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
            onClick={() => setOpen((value) => !value)}
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
            aria-expanded={open}
            aria-label="Toggle form checklist"
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
