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
import { INVOICE_LEVEL, isInrInvoiceCurrency } from "../utils/invoiceTax";

export const buildInvoiceFormChecklist = (
  formData,
  {
    departmentMandatory = false,
    categoryMandatory = false,
    showCategoryField = true,
    showCampaignField = false,
  } = {},
) => {
  if (!formData) return [];

  const item = ({
    label,
    done,
    required = false,
    optional,
    hint,
    hidden = false,
    warn,
  }) => {
    const isOptional = optional ?? !required;
    const resolvedHint =
      hint ?? (isOptional ? "optional" : "required");

    return {
      label,
      done,
      required: !isOptional,
      optional: isOptional,
      hint: resolvedHint,
      hidden,
      warn: warn !== undefined ? warn : !isOptional && !done,
    };
  };

  const validLineItems = (formData.lineItems || []).filter(
    (item) => item.description?.trim() && Number(item.unitRate) > 0,
  );
  const allLineItemsValid =
    (formData.lineItems || []).length > 0 &&
    (formData.lineItems || []).every(
      (item) => item.description?.trim() && Number(item.unitRate) > 0,
    );

  const hasVendorName = !!formData.vendorName?.trim();
  const vendorUnmatched =
    hasVendorName &&
    !formData.vendorMatched &&
    !formData.vendorRequestSubmitted;
  const vendorResolved =
    !!formData.vendorMatched || !!formData.vendorRequestSubmitted;

  const useInrTax = isInrInvoiceCurrency(formData.currency);
  const isGstinRequired = useInrTax && formData.gstTreatment !== "N/A";
  const isInvoiceLevelTax = formData.taxesLevel === INVOICE_LEVEL;
  const isSourceEmailRequired = formData.source === "Email";

  const vendorChecklistItems = [
    item({
      label: "Vendor name",
      done: hasVendorName,
      required: true,
    }),
  ];

  if (hasVendorName) {
    vendorChecklistItems.push(
      item({
        label: "Vendor matched in system",
        done: vendorResolved,
        required: true,
        warn: vendorUnmatched,
        hint: vendorUnmatched ? "action needed" : undefined,
      }),
    );
  }

  const taxComplianceItems = [
    item({
      label: "GST treatment",
      done: !!formData.gstTreatment,
      required: true,
    }),
    item({
      label: useInrTax ? "GSTIN" : "GSTIN / Tax ID",
      done: !!formData.gstin?.trim(),
      required: isGstinRequired,
    }),
    item({
      label: "Source of supply",
      done: !!String(formData.sourceOfSupply ?? "").trim(),
    }),
    item({
      label: "Destination",
      done: !!String(formData.destinationOfSupply ?? "").trim(),
    }),
  ];

  if (isInvoiceLevelTax) {
    if (useInrTax) {
      taxComplianceItems.push(
        item({
          label: "Invoice tax",
          done: !!formData.invoiceTax?.trim(),
          required: true,
        }),
      );
    } else {
      taxComplianceItems.push(
        item({
          label: "Tax name",
          done: !!String(formData.invoiceTaxName ?? "").trim(),
          required: true,
        }),
        item({
          label: "Tax rate %",
          done: Number(formData.invoiceTaxRate) > 0,
          required: true,
        }),
      );
    }
  }

  return [
    {
      group: "Vendor",
      items: vendorChecklistItems,
    },
    {
      group: "Invoice details",
      items: [
        item({
          label: "Bill number",
          done: !!formData.invoiceNumber?.trim(),
          required: true,
        }),
        item({
          label: "Billing date",
          done: !!formData.invoiceDate,
          required: true,
        }),
        item({
          label: "Due date",
          done: !!formData.dueDate,
          required: true,
        }),
        item({
          label: "Currency",
          done: !!(formData.currency || DEFAULT_CURRENCY).trim(),
          required: true,
        }),
        item({
          label: "Department",
          done: !!formData.departmentId,
          required: departmentMandatory,
        }),
        item({
          label: "Category",
          done: !!(formData.categoryId || formData.category?.id),
          required: categoryMandatory,
          hidden: !showCategoryField,
        }),
      ],
    },
    {
      group: "Tax & compliance",
      items: taxComplianceItems,
    },
    {
      group: "Source",
      items: [
        item({
          label: "Source",
          done: !!formData.source,
          required: true,
        }),
        item({
          label: "Source email",
          done: !!formData.sourceEmail?.trim(),
          required: isSourceEmailRequired,
          hidden: !isSourceEmailRequired,
        }),
      ],
    },
    {
      group: "Line items",
      items: [
        item({
          label:
            validLineItems.length === 0
              ? "At least one line item"
              : `${validLineItems.length} of ${formData.lineItems.length} item${formData.lineItems.length !== 1 ? "s" : ""} complete`,
          done: allLineItemsValid,
          required: true,
        }),
      ],
    },
    ...(showCampaignField
      ? [
          {
            group: "Campaign",
            items: [
              item({
                label: "Campaign",
                done: !!(
                  formData.campaignId || formData.campaignName?.trim()
                ),
                optional: true,
              }),
              item({
                label: "Reference number",
                done: !!String(formData.referenceNumber ?? "").trim(),
                optional: true,
              }),
            ],
          },
        ]
      : []),
  ];
};

export const InvoiceChecklist = ({
  formData,
  departmentMandatory = false,
  categoryMandatory = false,
  showCategoryField = true,
  showCampaignField = false,
}) => {
  const [open, setOpen] = useState(true);

  const groups = useMemo(
    () =>
      buildInvoiceFormChecklist(formData, {
        departmentMandatory,
        categoryMandatory,
        showCategoryField,
        showCampaignField,
      }),
    [
      formData,
      departmentMandatory,
      categoryMandatory,
      showCategoryField,
      showCampaignField,
    ],
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
                                  color:
                                    item.required
                                      ? "rgb(96, 165, 250)"
                                      : item.warn
                                        ? "#92400e"
                                        : "var(--color-text-tertiary)",
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
