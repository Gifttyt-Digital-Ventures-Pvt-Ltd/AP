import { normalizeFormGstRegistrations } from "./vendorGstRegistrations";

export const createEmptyVendorBranch = () => ({
  id: `vendor-branch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  branchName: "",
  branchCode: "",
  gstin: "",
});

export const normalizeVendorBranches = (branches = []) =>
  (Array.isArray(branches) ? branches : []).map((branch) => ({
    ...branch,
    id:
      branch.id ||
      branch.branchId ||
      branch.branch_id ||
      branch._clientId ||
      `vendor-branch-${Math.random().toString(36).slice(2, 9)}`,
    branchName: branch.branchName ?? branch.branch_name ?? branch.name ?? "",
    branchCode: String(branch.branchCode ?? branch.branch_code ?? branch.code ?? "")
      .trim()
      .toUpperCase(),
    gstin: String(branch.gstin ?? branch.mappedGstin ?? branch.mapped_gstin ?? branch.billingGstin ?? "")
      .trim()
      .toUpperCase(),
  }));

export const getActiveVendorBranches = (branches = []) =>
  normalizeVendorBranches(branches).filter(
    (branch) => branch.branchName || branch.branchCode || branch.gstin,
  );

export const validateVendorBranches = (branches = [], gstRegistrations = []) => {
  const activeBranches = getActiveVendorBranches(branches);
  const validGstins = new Set(
    normalizeFormGstRegistrations(gstRegistrations)
      .map((registration) => registration.gstin)
      .filter(Boolean),
  );
  const names = [];
  const codes = [];

  for (const branch of activeBranches) {
    if (!branch.branchName) return "Branch name is required for each vendor branch.";
    if (branch.gstin && !validGstins.has(branch.gstin)) {
      return "Vendor branch GSTIN must be selected from the vendor's added GST registrations.";
    }
    names.push(branch.branchName.trim().toLowerCase());
    if (branch.branchCode) {
      codes.push(branch.branchCode.trim().toLowerCase());
    }
  }

  if (new Set(names).size !== names.length) return "Vendor branch names must be unique.";
  if (codes.length > 0 && new Set(codes).size !== codes.length) {
    return "Vendor branch codes must be unique.";
  }
  return "";
};
