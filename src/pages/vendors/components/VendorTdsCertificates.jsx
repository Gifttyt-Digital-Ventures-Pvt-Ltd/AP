import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  useGetVendorTdsCertificatesQuery,
  useRevokeVendorTdsCertificateMutation,
} from "../../../Services/apis/taxApi";

const statusMeta = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  EXPIRED: "border-gray-200 bg-gray-50 text-gray-600",
  EXHAUSTED: "border-amber-200 bg-amber-50 text-amber-700",
  REVOKED: "border-red-200 bg-red-50 text-red-700",
};

const initialForm = {
  certificateNumber: "",
  deductorTan: "",
  vendorPan: "",
  sectionCode: "",
  lowerRate: "",
  validFrom: "",
  validTo: "",
  ceilingAmount: "",
  document: null,
};

const isRejectedVendorStatus = (status) =>
  String(status || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .toLowerCase() === "rejected";

const normalizeCert = (cert = {}) => ({
  id: cert.id ?? cert.certificateId ?? cert.certificate_id,
  certificateNumber: cert.certificateNumber ?? cert.certificate_number ?? "",
  sectionCode: cert.sectionCode ?? cert.section_code ?? "",
  lowerRate: cert.lowerRate ?? cert.lower_rate ?? 0,
  validFrom: cert.validFrom ?? cert.valid_from,
  validTo: cert.validTo ?? cert.valid_to,
  ceilingAmount: Number(cert.ceilingAmount ?? cert.ceiling_amount ?? 0),
  consumedAmount: Number(cert.consumedAmount ?? cert.consumed_amount ?? 0),
  status: String(cert.status || "ACTIVE").toUpperCase(),
});

const validateForm = (form) => {
  if (!form.certificateNumber.trim()) return "Certificate number is required";
  if (!/^[A-Z]{4}[0-9]{5}[A-Z]$/.test(form.deductorTan.trim().toUpperCase())) return "Invalid TAN";
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.vendorPan.trim().toUpperCase())) return "Invalid PAN";
  if (!form.sectionCode.trim()) return "Section is required";
  const rate = Number(form.lowerRate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return "Lower rate must be between 0 and 100";
  if (!form.validFrom || !form.validTo) return "Certificate validity dates are required";
  if (new Date(form.validFrom) > new Date(form.validTo)) return "Valid-from must be on or before valid-to";
  const ceiling = Number(form.ceilingAmount);
  if (!Number.isFinite(ceiling) || ceiling <= 0) return "Threshold amount must be greater than 0";
  if (!form.document) return "Certificate document is required";
  if (form.document.size > 10 * 1024 * 1024) return "Certificate document must be 10 MB or smaller";
  if (!["application/pdf", "image/jpeg", "image/png"].includes(form.document.type)) {
    return "Certificate document must be PDF, JPG, or PNG";
  }
  return "";
};

const CertificateCard = ({ cert, onRevoke, revoking, readOnly }) => {
  const row = normalizeCert(cert);
  const consumed = Math.max(Number(row.consumedAmount) || 0, 0);
  const ceiling = Math.max(Number(row.ceilingAmount) || 0, 0);
  const percent = ceiling > 0 ? Math.min((consumed / ceiling) * 100, 100) : 0;

  return (
    <div className="rounded-lg border border-border bg-background p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{row.certificateNumber || "Certificate"}</p>
          <p className="text-xs text-muted-foreground">
            {row.sectionCode} · {Number(row.lowerRate) || 0}% · {row.validFrom || "-"} to {row.validTo || "-"}
          </p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusMeta[row.status] || statusMeta.EXPIRED}`}>
          {row.status}
        </span>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>Threshold consumed</span>
          <span>{consumed.toLocaleString("en-IN")} / {ceiling.toLocaleString("en-IN")}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
        </div>
      </div>
      {!readOnly && row.status === "ACTIVE" && row.id ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={revoking}
          onClick={() => onRevoke(row.id)}
        >
          Revoke
        </Button>
      ) : null}
    </div>
  );
};

const VendorTdsCertificates = ({
  vendorId,
  vendorStatus = "",
  defaultSection = "",
  readOnly = false,
  enabled = true,
  pendingCertificates = [],
  onPendingCertificatesChange,
}) => {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ ...initialForm, sectionCode: defaultSection || "" });
  const { data: certificates = [], isFetching } = useGetVendorTdsCertificatesQuery(vendorId, {
    skip: !enabled || !vendorId,
  });
  const [revokeCertificate, { isLoading: revoking }] = useRevokeVendorTdsCertificateMutation();
  const isRejectedVendor = isRejectedVendorStatus(vendorStatus);
  const canUploadCertificate = Boolean(enabled && !isRejectedVendor && !readOnly);

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (isRejectedVendor) {
      toast.error("TDS certificate cannot be uploaded for a rejected vendor");
      return;
    }
    const validationError = validateForm(form);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    onPendingCertificatesChange?.([
      ...(Array.isArray(pendingCertificates) ? pendingCertificates : []),
      {
        ...form,
        _clientId: `tds-cert-${Date.now()}`,
      },
    ]);
    toast.success("TDS certificate added. Save vendor to upload it.");
    setForm({ ...initialForm, sectionCode: defaultSection || "" });
    setFormOpen(false);
  };

  const handleRevoke = async (certificateId) => {
    try {
      await revokeCertificate({ vendorId, certificateId }).unwrap();
      toast.success("TDS certificate revoked");
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.detail || "Could not revoke TDS certificate");
    }
  };

  if (!enabled) {
    return (
      <p className="text-xs text-muted-foreground">
        TDS certificate APIs are available after the TDS subscription is enabled.
      </p>
    );
  }

  if (isRejectedVendor) {
    return (
      <p className="text-xs text-muted-foreground">
        TDS certificates cannot be uploaded for rejected vendors.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Lower/nil TDS certificates</p>
        {canUploadCertificate ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setFormOpen((open) => !open)}>
            {formOpen ? "Cancel" : "Add certificate"}
          </Button>
        ) : null}
      </div>

      {formOpen && !readOnly ? (
        <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">Certificate number</Label>
            <Input value={form.certificateNumber} onChange={(event) => updateForm("certificateNumber", event.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Section</Label>
            <Input value={form.sectionCode} onChange={(event) => updateForm("sectionCode", event.target.value.toUpperCase())} placeholder="194J" />
          </div>
          <div>
            <Label className="text-xs">Deductor TAN</Label>
            <Input value={form.deductorTan} onChange={(event) => updateForm("deductorTan", event.target.value.toUpperCase())} />
          </div>
          <div>
            <Label className="text-xs">Vendor PAN</Label>
            <Input value={form.vendorPan} onChange={(event) => updateForm("vendorPan", event.target.value.toUpperCase())} />
          </div>
          <div>
            <Label className="text-xs">Lower/Nil rate %</Label>
            <Input type="number" min="0" max="100" value={form.lowerRate} onChange={(event) => updateForm("lowerRate", event.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Threshold amount</Label>
            <Input type="number" min="0" value={form.ceilingAmount} onChange={(event) => updateForm("ceilingAmount", event.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Valid from</Label>
            <Input type="date" value={form.validFrom} onChange={(event) => updateForm("validFrom", event.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Valid to</Label>
            <Input type="date" value={form.validTo} onChange={(event) => updateForm("validTo", event.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Document</Label>
            <Input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => updateForm("document", event.target.files?.[0] || null)} />
          </div>
          <div className="md:col-span-2">
            <Button type="button" size="sm" onClick={handleSubmit}>
              Add certificate
            </Button>
          </div>
        </div>
      ) : null}

      {Array.isArray(pendingCertificates) && pendingCertificates.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          <p className="font-medium">Pending upload on vendor save</p>
          {pendingCertificates.map((certificate) => (
            <div key={certificate._clientId || certificate.certificateNumber}>
              {certificate.certificateNumber} · {certificate.sectionCode} · {certificate.document?.name || "document selected"}
            </div>
          ))}
        </div>
      ) : null}

      {isFetching ? <p className="text-xs text-muted-foreground">Loading certificates...</p> : null}
      {certificates.length > 0 ? (
        <div className="grid gap-3">
          {certificates.map((cert) => (
            <CertificateCard
              key={cert.id ?? cert.certificateId ?? cert.certificate_number}
              cert={cert}
              readOnly={readOnly}
              revoking={revoking}
              onRevoke={handleRevoke}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          No TDS certificates uploaded.
        </p>
      )}
    </div>
  );
};

export default VendorTdsCertificates;
