import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useSidebar } from "../../components/Layout";
import {
  useGetVendorsQuery,
  useLazyGetVendorQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
  useApproveVendorMutation,
} from "../../Services/apis/invoicesVendorsApi";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  CircleCheckBig,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  X,
  Pencil,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useActionGuard } from "../../hooks/useActionGuard";
import { useCreditErrorHandler } from "../../contexts/CreditErrorContext";
import { useRBAC } from "../../contexts/RBACContext";
import { useAuth } from "../../contexts/AuthContext";
import { useGetCorporateUserDetailsQuery } from "../../Services/apis/corporateApi";
import { useRequestAccountingReadyUnlockMutation } from "../../Services/apis/accountingApi";
import { clearNotificationQueryParams } from "../../utils/notificationQueryParams";
import {
  buildCurrentUserIdentity,
  canEditVendor,
  canSaveVendorEdit,
  extractApiErrorDetail,
  formatWorkflowStatus,
  getVendorEditBlockedMessage,
  isSavedVendorStatus,
  NEEDS_CORRECTION_STATUS,
  resolveBulkCreateVendorStatus,
  resolveSavedVendorSubmitStatus,
} from "../../utils/approvalWorkflow";
import { getAccountingErrorMessage } from "../accounting/utils/coaUtils";
import {
  getAccountingUnlockRequestStatus,
  isAccountingReadyLocked,
} from "../../utils/accountingLock";
import CreateVendorPage from "./components/create-vendor/CreateVendorPage";
import * as XLSX from "@e965/xlsx";
import AppDataTable from "../../components/common/AppDataTable";
import RefreshButton from "../../components/common/RefreshButton";
import TableSortButton from "../../components/common/TableSortButton";
import { TableCell, TableRow } from "../../components/ui/table";
import MultipleVendorUploadDialog from "./components/MultipleVendorUploadDialog";
import {
  getVendorUploadMandatoryFieldKeys,
  isVendorFieldRequired,
  VENDOR_FIELD_SECTIONS,
  VENDOR_FORM_KEY_TO_SECTION,
} from "../../utils/vendorFieldConfig";
import {
  getBulkVendorUploadValidationErrors,
  getVendorValidationErrors,
  getVendorGstVerificationErrors,
  parseMsmeValue,
} from "../../utils/vendorValidation";
import BulkUploadReviewDialog from "./components/BulkUploadReviewDialog";
import DeleteVendorDialog from "./components/DeleteVendorDialog";
import ViewVendorPage from "./components/view-vendor/ViewVendorPage";
import {
  getFirstVendorGstin,
  getVendorGstRegistrations,
} from "./components/VendorGstRegistrationsPanel";
import {
  createEmptyVendorDocuments,
  normalizeVendorDocuments,
} from "./utils/vendorDocuments";
import {
  getVendorTdsCertificateValidationErrors,
  getVendorTdsValidationErrors,
  hasConfiguredVendorTds,
  normalizeVendorTds,
} from "./utils/vendorTds";
import {
  buildVendorSaveBody,
  normalizeVendorForSave,
} from "./utils/vendorSave";
import { mergeBulkVendorRowsByPan } from "./utils/bulkVendorMerge";
import { isVendorPortalFetchEnabled } from "../../utils/vendorVerificationConfig";
import VendorApprovalDialog from "./components/VendorApprovalDialog";
import IntegrationSourceBadge from "../../components/integrations/IntegrationSourceBadge";
import useZohoIntegrationActive from "../../hooks/useZohoIntegrationActive";
import { withIntegrationTableHeader } from "../../utils/integrationProvenance";

const VENDOR_UPLOAD_FIELDS = [
  "vendorId",
  "name",
  "trade_name",
  "vendor_type",
  "email",
  "mobile",
  "phone",
  "contact_person",
  "pan",
  "msme",
  "category",
  "website",
  "currency",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "pincode",
  "country",
  // New top-level scalar fields — same set as the full-screen Create/Edit form.
  "paymentTerms",
  "modeOfDelivery",
  "deliveryTerms",
  "vendorStatus",
  "oneTimeVendor",
  "foreignVendor",
  "udyamRegistrationNo",
  "msmeCategory",
  "iecNumber",
  "tan",
  "tin",
  "stc",
  "stRegistrationNumber",
  "panStatus",
  "panReferenceNo",
  "natureOfAssessee",
  "tcsGroup",
  "specifiedPerson206AB",
  "tdsApplicable",
  "tdsGroup",
  "lowNilDeductionCertificateNo",
  "certificateValidity",
  // Row Type decides what a row contributes: a GSTIN registration (default), a bank
  // account, or a branch. See downloadVendorTemplate's guide sheet for the full rules.
  "row_type",
  "gstin",
  "registrationType",
  "hsnSacDefaultCode",
  "reverseChargeApplicable",
  "eInvoicingApplicable",
  "account_holder_name",
  "account_number",
  "ifsc_code",
  "bank_name",
  "branch",
  // New Bank Account row-type-only fields (Row Type = "Bank Account").
  "bankAccountType",
  "swiftCode",
  "bankCurrency",
  "bankActiveStatus",
  "bankContactDetails",
  "bankAddress",
  // New Branch row-type-only fields (Row Type = "Branch").
  "branchName",
  "branchCode",
  "branchGstin",
  "branchAddressLine1",
  "branchAddressLine2",
  "branchCity",
  "branchDistrict",
  "branchState",
  "branchPincode",
  "branchCountry",
  "notes",
];

const VENDOR_UPLOAD_HEADER_MAP = {
  vendorId: "Vendor ID",
  name: "Vendor Name",
  trade_name: "Trade Name",
  vendor_type: "Vendor Type",
  email: "Email ID",
  mobile: "Mobile No",
  phone: "Phone No",
  contact_person: "Contact person",
  category: "Category",
  website: "Website",
  currency: "Currency",
  address_line1: "Address Line 1",
  address_line2: "Address Line 2",
  city: "City",
  state: "State",
  pincode: "Pincode",
  country: "Country",
  pan: "PAN No",
  msme: "MSME",
  paymentTerms: "Payment Terms",
  modeOfDelivery: "Mode of Delivery",
  deliveryTerms: "Delivery Terms",
  vendorStatus: "Vendor Status",
  oneTimeVendor: "One Time Vendor",
  foreignVendor: "Foreign Vendor",
  udyamRegistrationNo: "Udyam Registration No.",
  msmeCategory: "MSME Category",
  iecNumber: "IEC Number",
  tan: "TAN",
  tin: "TIN",
  stc: "STC",
  stRegistrationNumber: "ST Registration Number",
  panStatus: "PAN Status",
  panReferenceNo: "PAN Reference No.",
  natureOfAssessee: "Nature of Assessee",
  tcsGroup: "TCS Group",
  specifiedPerson206AB: "Specified Person u/s 206AB",
  tdsApplicable: "TDS Applicable",
  tdsGroup: "TDS Group/List",
  lowNilDeductionCertificateNo: "Low/Nil Deduction Certificate No.",
  certificateValidity: "Certificate Validity",
  row_type: "Row Type",
  gstin: "GST no",
  registrationType: "GST Registration Type",
  hsnSacDefaultCode: "HSN/SAC Default Code",
  reverseChargeApplicable: "Reverse Charge Applicable",
  eInvoicingApplicable: "e-Invoicing Applicable",
  account_holder_name: "Account Name",
  account_number: "Account Number",
  ifsc_code: "IFSC Code",
  bank_name: "Bank Name",
  branch: "Branch",
  bankAccountType: "Account Type",
  swiftCode: "Swift Code",
  bankCurrency: "Bank Currency",
  bankActiveStatus: "Bank Active Status",
  bankContactDetails: "Bank Contact Details",
  bankAddress: "Bank Address",
  branchName: "Branch Name",
  branchCode: "Branch Code",
  branchGstin: "Branch GSTIN",
  branchAddressLine1: "Branch Address Line 1",
  branchAddressLine2: "Branch Address Line 2",
  branchCity: "Branch City",
  branchDistrict: "Branch District",
  branchState: "Branch State",
  branchPincode: "Branch Pincode",
  branchCountry: "Branch Country",
  notes: "Remarks",
};

const getVendorApiErrorMessages = (response) => {
  if (!response || !Array.isArray(response.failed)) return [];
  return response.failed.flatMap((item) =>
    Array.isArray(item?.errors) ? item.errors.filter(Boolean) : [],
  );
};

const getVendorType = (vendor) =>
  vendor?.vendor_type || vendor?.vendorType || "Company";

// Fields owned by a per-GSTIN registration row (or, for bulk upload, only meaningful on
// a "GSTIN"-type row) — excluded from blanket vendor-level "mandatory" treatment so a
// tenant marking one of these mandatory doesn't force it onto every bulk-upload row,
// including Bank Account / Branch typed rows where it doesn't apply.
const GST_REGISTRATION_OWNED_VENDOR_SECTIONS = new Set([
  VENDOR_FIELD_SECTIONS.ADDRESS_LINE_1,
  VENDOR_FIELD_SECTIONS.ADDRESS_LINE_2,
  VENDOR_FIELD_SECTIONS.CITY,
  VENDOR_FIELD_SECTIONS.STATE,
  VENDOR_FIELD_SECTIONS.PINCODE,
  VENDOR_FIELD_SECTIONS.COUNTRY,
  VENDOR_FIELD_SECTIONS.ACCOUNT_NAME,
  VENDOR_FIELD_SECTIONS.ACCOUNT_NUMBER,
  VENDOR_FIELD_SECTIONS.IFSC_CODE,
  VENDOR_FIELD_SECTIONS.BANK_NAME,
  VENDOR_FIELD_SECTIONS.BRANCH,
  VENDOR_FIELD_SECTIONS.GST_NO,
]);

const getNormalizedVendorStatusKey = (status) =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");

const isPendingApprovalStatus = (status) =>
  getNormalizedVendorStatusKey(status) === "pending approval";

const vendorSortOptions = [
  { value: "createdAt", label: "Upload date", defaultDirection: "desc" },
];

const NEW_VENDOR_FIELD_DEFAULTS = {
  bankAccounts: [],
  paymentTerms: "",
  modeOfDelivery: "",
  deliveryTerms: "",
  vendorStatus: "",
  oneTimeVendor: false,
  foreignVendor: false,
  udyamRegistrationNo: "",
  msmeCategory: "",
  iecNumber: "",
  tan: "",
  tin: "",
  stc: "",
  stRegistrationNumber: "",
  panStatus: "",
  panReferenceNo: "",
  natureOfAssessee: "",
  tcsGroup: "",
  specifiedPerson206AB: false,
  tdsGroup: "",
  lowNilDeductionCertificateNo: "",
  certificateValidity: "",
  tdsApplicable: false,
};

const buildVendorViewData = (vendor) => {
  if (!vendor) return null;
  const firstGstin = getFirstVendorGstin(vendor);
  const vendorBranches =
    vendor.vendorBranches ??
    vendor.vendor_branches ??
    vendor.branchDetails ??
    vendor.branch_details ??
    [];
  return {
    id: vendor.id ?? vendor.vendorId,
    vendorId: vendor.vendorId ?? vendor.id,
    status: vendor.status,
    name: vendor.name || "",
    trade_name: vendor.trade_name || vendor.tradeName || "",
    vendor_type: vendor.vendor_type || "Company",
    email: vendor.email || "",
    phone: vendor.phone || "",
    mobile: vendor.mobile || "",
    pan: vendor.pan || "",
    gstin: firstGstin || "",
    gstRegistrations: getVendorGstRegistrations(vendor),
    vendorBranches: Array.isArray(vendorBranches) ? vendorBranches : [],
    msme: parseMsmeValue(vendor.msme) === true,
    address_line1: vendor.address_line1 || "",
    address_line2: vendor.address_line2 || "",
    city: vendor.city || "",
    state: vendor.state || "",
    pincode: vendor.pincode || "",
    country: vendor.country || "India",
    bank_name: vendor.bank_name || "",
    account_number: vendor.account_number || "",
    ifsc_code: vendor.ifsc_code || "",
    branch: vendor.branch || "",
    account_holder_name: vendor.account_holder_name || "",
    category: vendor.category || "",
    currency: vendor.currency || "INR",
    contact_person: vendor.contact_person || "",
    website: vendor.website || "",
    notes: vendor.notes || "",
    documents: normalizeVendorDocuments(vendor.documents),
    tdsMapping: normalizeVendorTds(vendor.tdsMapping ?? vendor.tdsMappings),
    ...Object.fromEntries(
      Object.keys(NEW_VENDOR_FIELD_DEFAULTS).map((key) => [
        key,
        vendor[key] ?? NEW_VENDOR_FIELD_DEFAULTS[key],
      ]),
    ),
  };
};

const Vendors = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const handledNotificationRef = useRef(null);
  const [createVendor, { isLoading: createVendorLoading }] =
    useCreateVendorMutation();
  const [updateVendor, { isLoading: updateVendorLoading }] =
    useUpdateVendorMutation();
  const [deleteVendor, { isLoading: deleteVendorLoading }] =
    useDeleteVendorMutation();
  const [approveVendor, { isLoading: approveVendorLoading }] =
    useApproveVendorMutation();
  const [getVendor] = useLazyGetVendorQuery();
  const [requestAccountingUnlock, { isLoading: requestVendorUnlockLoading }] =
    useRequestAccountingReadyUnlockMutation();
  const { user } = useAuth();
  const { data: corporateUserContext = null } =
    useGetCorporateUserDetailsQuery();
  const { guardAction, canPerformAction } = useActionGuard();
  const { handleCreditError } = useCreditErrorHandler();
  const { corporateScreens, isCorporateAdmin } = useRBAC();
  const { showIntegrationColumn } = useZohoIntegrationActive();
  const activeVendorFields = corporateScreens?.activeVendorFields ?? [];
  const portalVerificationEnabled = isVendorPortalFetchEnabled(
    corporateScreens?.activeVendorVerification,
  );
  const vendorFieldConfiguration =
    corporateScreens?.vendorFieldConfiguration ?? [];
  const effectiveActiveVendorFields = useMemo(
    () =>
      activeVendorFields.filter(
        (section) =>
          !GST_REGISTRATION_OWNED_VENDOR_SECTIONS.has(
            String(section).trim().toUpperCase(),
          ),
      ),
    [activeVendorFields],
  );
  const vendorUploadMandatoryFields = useMemo(
    () => getVendorUploadMandatoryFieldKeys(effectiveActiveVendorFields),
    [effectiveActiveVendorFields],
  );
  const vendorUploadOptionalFields = useMemo(
    () =>
      VENDOR_UPLOAD_FIELDS.filter(
        (field) => !vendorUploadMandatoryFields.includes(field),
      ),
    [vendorUploadMandatoryFields],
  );
  const canUpdateVendorPermission = canPerformAction("vendors.update");
  const canRequestVendorPermission = canPerformAction("invoices.addVendor");
  const vendorEditContext = useMemo(
    () => ({
      ...buildCurrentUserIdentity({ user, corporateUserContext }),
      canUpdateVendor: canUpdateVendorPermission,
      canRequestVendor: canRequestVendorPermission,
      isCorporateAdmin,
    }),
    [
      user,
      corporateUserContext,
      canUpdateVendorPermission,
      canRequestVendorPermission,
      isCorporateAdmin,
    ],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorSort, setVendorSort] = useState({
    sortBy: "createdAt",
    sortDirection: "desc",
  });
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const vendorQueryParams = useMemo(
    () => ({
      ...(deferredSearchTerm.trim()
        ? { search: deferredSearchTerm.trim() }
        : {}),
      ...(typeFilter !== "all" ? { type: typeFilter } : {}),
      sortBy: vendorSort.sortBy,
      sortDirection: vendorSort.sortDirection,
    }),
    [deferredSearchTerm, typeFilter, vendorSort],
  );
  const {
    data: vendorsData = [],
    isError: vendorsError,
    isFetching: vendorsFetching,
    refetch: refetchVendors,
  } = useGetVendorsQuery(vendorQueryParams);
  const [singleVendorCreateOpen, setSingleVendorCreateOpen] = useState(false);
  const { setHideSidebar } = useSidebar();
  const [vendorUploadOptionOpen, setVendorUploadOptionOpen] = useState(false);
  const [multipleVendorUploadOpen, setMultipleVendorUploadOpen] =
    useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [viewingVendor, setViewingVendor] = useState(null);
  const [viewVendorEditMode, setViewVendorEditMode] = useState(false);
  const [vendorDeleteTarget, setVendorDeleteTarget] = useState(null);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [approvalComments, setApprovalComments] = useState("");
  const [bulkReviewOpen, setBulkReviewOpen] = useState(false);
  const [bulkReviewData, setBulkReviewData] = useState(null);
  const [formData, setFormData] = useState({
    // Basic Information
    vendorId: "",
    name: "",
    trade_name: "",
    vendor_type: "Company",
    email: "",
    phone: "",
    mobile: "",

    // Tax Information
    pan: "",
    gstin: "",
    gstRegistrations: [],
    vendorBranches: [],
    msme: false,

    // Address
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",

    // Bank Details
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    branch: "",
    account_holder_name: "",

    // Additional Information
    category: "",
    currency: "INR",
    contact_person: "",
    website: "",
    notes: "",
    documents: createEmptyVendorDocuments(),
    tdsMapping: null,
    tdsCertificates: [],
    tdsDetailsEdited: false,

    ...NEW_VENDOR_FIELD_DEFAULTS,
  });

  const vendors = Array.isArray(vendorsData) ? vendorsData : [];

  useEffect(() => {
    if (vendorsError) {
      toast.error("Failed to load vendors");
    }
  }, [vendorsError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingVendor) {
      if (!canSaveVendorEdit(editingVendor, vendorEditContext)) {
        if (!guardAction("vendors.update")) return;
        toast.error(
          "Only the creator can edit a vendor in Needs Correction status",
        );
        return;
      }
    } else if (!guardAction("vendors.create")) {
      return;
    }

    const validationErrors = getVendorValidationErrors(formData, {
      activeVendorFields: effectiveActiveVendorFields,
      vendorFieldConfiguration,
    });
    const tdsValidationErrors = [
      ...getVendorTdsValidationErrors(formData.tdsMapping),
      ...getVendorTdsCertificateValidationErrors(formData.tdsCertificates, {
        requireCertificate: Boolean(
          formData.tdsDetailsEdited &&
          hasConfiguredVendorTds(formData.tdsMapping),
        ),
      }),
    ];
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }
    if (tdsValidationErrors.length > 0) {
      toast.error(tdsValidationErrors[0]);
      return;
    }

    const gstVerificationErrors = getVendorGstVerificationErrors(
      formData,
      null,
      {
        gstVerificationEnabled: portalVerificationEnabled,
        activeVendorFields: effectiveActiveVendorFields,
      },
    );
    if (gstVerificationErrors.length > 0) {
      toast.error(gstVerificationErrors[0]);
      return;
    }

    try {
      if (editingVendor) {
        const submittingSavedVendor = isSavedVendorStatus(editingVendor.status);
        const vendorPayload = buildVendorSaveBody(
          formData,
          submittingSavedVendor
            ? { status: resolveSavedVendorSubmitStatus() }
            : {},
        );
        await updateVendor({
          id: editingVendor.id,
          body: vendorPayload,
        }).unwrap();
        toast.success(
          submittingSavedVendor
            ? "Vendor submitted for approval"
            : "Vendor updated successfully",
        );
      } else {
        const vendorPayload = buildVendorSaveBody(formData);
        const response = await createVendor(vendorPayload).unwrap();
        const successCount = Number(response?.successCount ?? 0);
        const failedCount = Number(response?.failedCount ?? 0);
        const errorMessages = getVendorApiErrorMessages(response);

        if (failedCount > 0 && successCount === 0) {
          toast.error(errorMessages[0] || "Vendor creation failed");
          return;
        }

        if (failedCount > 0) {
          toast.warning(`Vendor created with ${failedCount} issue(s)`);
        } else {
          toast.success("Vendor created successfully");
        }
      }
      setSingleVendorCreateOpen(false);
      setViewVendorEditMode(false);
      setViewingVendor(null);
      resetForm();
    } catch (error) {
      if (handleCreditError(error)) return;
      toast.error(extractApiErrorDetail(error) || "Failed to save vendor");
    }
  };

  const openSingleVendorCreate = () => {
    setVendorUploadOptionOpen(false);
    resetForm();
    setSingleVendorCreateOpen(true);
  };

  const closeSingleVendorCreate = () => {
    setSingleVendorCreateOpen(false);
    resetForm();
  };

  const openMultipleVendorDialog = () => {
    setVendorUploadOptionOpen(false);
    setMultipleVendorUploadOpen(true);
  };

  const handleBulkVendorUpload = async (rows) => {
    if (!guardAction("vendors.create")) {
      return { errors: [] };
    }

    try {
      const vendorsPayload = mergeBulkVendorRowsByPan(rows)
        .map((vendor) => normalizeVendorForSave(vendor))
        .filter((vendor) => vendor.name);

      if (!vendorsPayload.length) {
        return {
          errors: [
            "No valid vendor records found. Please include at least a vendor name column",
          ],
        };
      }

      const bulkStatus = resolveBulkCreateVendorStatus();
      const response = await createVendor(
        vendorsPayload.map((vendor) => ({ ...vendor, status: bulkStatus })),
      ).unwrap();
      const successCount = Number(response?.successCount ?? 0);
      const failedCount = Number(response?.failedCount ?? 0);
      const errorMessages = getVendorApiErrorMessages(response);
      setBulkReviewData(response);
      setBulkReviewOpen(true);

      if (failedCount > 0 && successCount === 0) {
        return {
          errors:
            errorMessages.length > 0 ? errorMessages : ["Vendor upload failed"],
        };
      }

      if (failedCount > 0) {
        toast.warning(`${successCount} uploaded, ${failedCount} failed`);
      } else {
        toast.success(
          `${successCount || vendorsPayload.length} vendors uploaded successfully`,
        );
      }
      setMultipleVendorUploadOpen(false);
      return { errors: [] };
    } catch (error) {
      if (handleCreditError(error)) {
        return { errors: ["Insufficient tokens or action unavailable"] };
      }
      return { errors: ["Failed to parse or upload vendor file"] };
    }
  };

  const validateVendorUploadRow = (row, rowIndex) =>
    getBulkVendorUploadValidationErrors(row, { rowIndex });

  const getUploadGuideType = (fieldKey, optionalText) => {
    const section = VENDOR_FORM_KEY_TO_SECTION[fieldKey];
    if (
      section &&
      isVendorFieldRequired(section, effectiveActiveVendorFields)
    ) {
      return "Mandatory";
    }
    return optionalText;
  };

  const downloadVendorTemplate = () => {
    const headerRow = VENDOR_UPLOAD_FIELDS.map((field) => VENDOR_UPLOAD_HEADER_MAP[field] || field);

    const guideRows = [
      ["Bulk upload instructions"],
      [
        "Rows with the same valid PAN in this file are merged into one vendor. Each row's 'Row Type' column decides what it contributes to that vendor.",
      ],
      [
        "Row Type = 'GSTIN' (or leave blank) — the row adds one GST registration. Row Type = 'Bank Account' — the row adds one bank account. Row Type = 'Branch' — the row adds one branch/location. Identity fields (Vendor Name, Trade Name, contact, the new scalar fields, etc.) are taken from the first row in each PAN group — repeat Vendor Name and PAN on every row regardless of its type.",
      ],
      [""],
      ["Example: one vendor, two GSTINs, one bank account, one branch (same PAN on every row)"],
      ["Vendor Name", "PAN No", "Row Type", "GST no", "State", "City", "Bank Name", "Account Number", "Branch Name"],
      [
        "Acme India Pvt Ltd",
        "ABCDE1234F",
        "GSTIN",
        "27AAAAA0000A1Z5",
        "Maharashtra",
        "Mumbai",
        "",
        "",
        "",
      ],
      [
        "Acme India Pvt Ltd",
        "ABCDE1234F",
        "GSTIN",
        "29AAAAA0000A1Z6",
        "Karnataka",
        "Bengaluru",
        "",
        "",
        "",
      ],
      [
        "Acme India Pvt Ltd",
        "ABCDE1234F",
        "Bank Account",
        "",
        "",
        "",
        "HDFC Bank",
        "000123456789",
        "",
      ],
      [
        "Acme India Pvt Ltd",
        "ABCDE1234F",
        "Branch",
        "",
        "",
        "",
        "",
        "",
        "Mumbai HO",
      ],
      [""],
      ["Parameter", "Type"],
      ["Vendor Name", getUploadGuideType("name", "Optional")],
      ["Trade Name", getUploadGuideType("trade_name", "Optional")],
      [
        "Vendor Type",
        getUploadGuideType("vendor_type", "Optional (Company/Individual)"),
      ],
      ["Email ID", getUploadGuideType("email", "Optional")],
      ["Mobile No", getUploadGuideType("mobile", "Optional")],
      ["Phone No", getUploadGuideType("phone", "Optional")],
      ["Contact person", getUploadGuideType("contact_person", "Optional")],
      ["Category", getUploadGuideType("category", "Optional")],
      ["Website", getUploadGuideType("website", "Optional")],
      ["Currency", getUploadGuideType("currency", "Optional")],
      [
        "Address Line 1",
        getUploadGuideType("address_line1", "Optional. Vendor's own address (first row wins), not a branch's address"),
      ],
      ["Address Line 2", getUploadGuideType("address_line2", "Optional")],
      ["City", getUploadGuideType("city", "Optional")],
      ["State", getUploadGuideType("state", "Optional")],
      [
        "Pincode",
        getUploadGuideType(
          "pincode",
          "Optional. Must be 6 digits when Country is India, otherwise any postal code text",
        ),
      ],
      ["Country", getUploadGuideType("country", "Optional")],
      [
        "PAN No",
        getUploadGuideType(
          "pan",
          "Optional. Repeat the same PAN on every row for a multi-row vendor",
        ),
      ],
      ["MSME", getUploadGuideType("msme", "Optional (Yes/No)")],
      ["Payment Terms", getUploadGuideType("paymentTerms", "Optional")],
      ["Mode of Delivery", getUploadGuideType("modeOfDelivery", "Optional")],
      ["Delivery Terms", getUploadGuideType("deliveryTerms", "Optional")],
      ["Vendor Status", getUploadGuideType("vendorStatus", "Optional (Active/Inactive)")],
      ["One Time Vendor", getUploadGuideType("oneTimeVendor", "Optional (Yes/No)")],
      ["Foreign Vendor", getUploadGuideType("foreignVendor", "Optional (Yes/No)")],
      ["Udyam Registration No.", getUploadGuideType("udyamRegistrationNo", "Optional")],
      ["MSME Category", getUploadGuideType("msmeCategory", "Optional (Micro/Small/Medium)")],
      ["IEC Number", getUploadGuideType("iecNumber", "Optional")],
      ["TAN", getUploadGuideType("tan", "Optional")],
      ["TIN", getUploadGuideType("tin", "Optional")],
      ["STC", getUploadGuideType("stc", "Optional")],
      ["ST Registration Number", getUploadGuideType("stRegistrationNumber", "Optional")],
      ["PAN Status", getUploadGuideType("panStatus", "Optional")],
      ["PAN Reference No.", getUploadGuideType("panReferenceNo", "Optional")],
      ["Nature of Assessee", getUploadGuideType("natureOfAssessee", "Optional")],
      ["TCS Group", getUploadGuideType("tcsGroup", "Optional")],
      ["Specified Person u/s 206AB", getUploadGuideType("specifiedPerson206AB", "Optional (Yes/No)")],
      ["TDS Applicable", getUploadGuideType("tdsApplicable", "Optional (Yes/No)")],
      ["TDS Group/List", getUploadGuideType("tdsGroup", "Optional. Only meaningful when TDS Applicable = Yes")],
      [
        "Low/Nil Deduction Certificate No.",
        getUploadGuideType("lowNilDeductionCertificateNo", "Optional. Only meaningful when TDS Applicable = Yes"),
      ],
      [
        "Certificate Validity",
        getUploadGuideType("certificateValidity", "Optional date (YYYY-MM-DD). Only meaningful when TDS Applicable = Yes"),
      ],
      [
        "Row Type",
        "Optional. 'GSTIN' (default if blank), 'Bank Account', or 'Branch' — decides what this row contributes",
      ],
      [
        "GST no",
        "Optional. Only used on GSTIN-type rows; one GSTIN per row, multiple rows with the same PAN are merged",
      ],
      ["GST Registration Type", "Optional. Only used on GSTIN-type rows"],
      ["HSN/SAC Default Code", "Optional. Only used on GSTIN-type rows"],
      ["Reverse Charge Applicable", "Optional (Yes/No). Only used on GSTIN-type rows"],
      ["e-Invoicing Applicable", "Optional (Yes/No). Only used on GSTIN-type rows"],
      [
        "Account Name",
        getUploadGuideType(
          "account_holder_name",
          "Optional. Used on Bank Account-type rows (and legacy per-GSTIN bank details)",
        ),
      ],
      [
        "Account Number",
        getUploadGuideType("account_number", "Optional. Used on Bank Account-type rows"),
      ],
      ["IFSC Code", getUploadGuideType("ifsc_code", "Optional. Used on Bank Account-type rows")],
      ["Bank Name", getUploadGuideType("bank_name", "Optional. Used on Bank Account-type rows")],
      [
        "Branch",
        getUploadGuideType("branch", "Optional. Legacy per-GSTIN bank branch name (not a vendor branch/location)"),
      ],
      ["Account Type", "Optional (Savings/Current/Other). Only used on Bank Account-type rows"],
      ["Swift Code", "Optional. Only used on Bank Account-type rows"],
      ["Bank Currency", "Optional. Only used on Bank Account-type rows"],
      ["Bank Active Status", "Optional (Active/Inactive, defaults to Active). Only used on Bank Account-type rows"],
      ["Bank Contact Details", "Optional. Only used on Bank Account-type rows"],
      ["Bank Address", "Optional. Only used on Bank Account-type rows"],
      ["Branch Name", "Optional. Only used on Branch-type rows"],
      ["Branch Code", "Optional. Only used on Branch-type rows"],
      ["Branch GSTIN", "Optional. Maps this branch to one of the vendor's GSTINs. Only used on Branch-type rows"],
      ["Branch Address Line 1", "Optional. Only used on Branch-type rows"],
      ["Branch Address Line 2", "Optional. Only used on Branch-type rows"],
      ["Branch City", "Optional. Only used on Branch-type rows"],
      ["Branch District", "Optional. Only used on Branch-type rows"],
      ["Branch State", "Optional. Only used on Branch-type rows"],
      ["Branch Pincode", "Optional. Only used on Branch-type rows"],
      ["Branch Country", "Optional. Only used on Branch-type rows, defaults to India"],
      ["Remarks", getUploadGuideType("notes", "Optional")],
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([headerRow]),
      "Sheet1",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(guideRows),
      "Guide",
    );
    const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Vendor_Upload_Format.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const loadVendorIntoForm = (vendor) => {
    if (!canEditVendor(vendor, vendorEditContext)) {
      toast.error(getVendorEditBlockedMessage(vendor));
      return false;
    }
    setEditingVendor(vendor);
    const firstGstin = getFirstVendorGstin(vendor);
    const vendorBranches =
      vendor.vendorBranches ??
      vendor.vendor_branches ??
      vendor.branchDetails ??
      vendor.branch_details ??
      [];
    setFormData({
      id: vendor.id ?? vendor.vendorId,
      vendorId: vendor.vendorId ?? vendor.id,
      status: vendor.status,
      name: vendor.name || "",
      trade_name: vendor.trade_name || vendor.tradeName || "",
      vendor_type: vendor.vendor_type || "Company",
      email: vendor.email || "",
      phone: vendor.phone || "",
      mobile: vendor.mobile || "",
      pan: vendor.pan || "",
      gstin: firstGstin || "",
      gstRegistrations: getVendorGstRegistrations(vendor),
      vendorBranches: Array.isArray(vendorBranches) ? vendorBranches : [],
      msme: parseMsmeValue(vendor.msme) === true,
      address_line1: vendor.address_line1 || "",
      address_line2: vendor.address_line2 || "",
      city: vendor.city || "",
      state: vendor.state || "",
      pincode: vendor.pincode || "",
      country: vendor.country || "India",
      bank_name: vendor.bank_name || "",
      account_number: vendor.account_number || "",
      ifsc_code: vendor.ifsc_code || "",
      branch: vendor.branch || "",
      account_holder_name: vendor.account_holder_name || "",
      category: vendor.category || "",
      currency: vendor.currency || "INR",
      contact_person: vendor.contact_person || "",
      website: vendor.website || "",
      notes: vendor.notes || "",
      documents: normalizeVendorDocuments(vendor.documents),
      tdsMapping: normalizeVendorTds(vendor.tdsMapping ?? vendor.tdsMappings),
      tdsCertificates: [],
      tdsDetailsEdited: false,

      // Carried forward opaquely so re-saving via this modal doesn't drop fields
      // only editable from the full-screen Create Vendor page.
      ...Object.fromEntries(
        Object.keys(NEW_VENDOR_FIELD_DEFAULTS).map((key) => [
          key,
          vendor[key] ?? NEW_VENDOR_FIELD_DEFAULTS[key],
        ]),
      ),
    });
    return true;
  };

  const handleEdit = (vendor) => {
    if (!loadVendorIntoForm(vendor)) return;
    setViewVendorEditMode(true);
  };

  const handleRequestVendorUnlock = async (vendor) => {
    if (!canUpdateVendorPermission) {
      toast.error("You need vendor edit access to request unlock");
      return;
    }
    if (!guardAction("accounting.ready.unlockRequest")) return;
    try {
      const result = await requestAccountingUnlock({
        id:
          vendor?.accountingReadyId ||
          vendor?.accounting_ready_id ||
          vendor?.readyItemId,
        objectType: "VENDOR",
        objectId: vendor?.id,
      }).unwrap();
      toast.success(result?.message || "Unlock request submitted");
      await refetchVendors();
    } catch (error) {
      toast.error(
        getAccountingErrorMessage(error, "Could not raise unlock request"),
      );
    }
  };

  const handleDelete = async (id) => {
    if (!guardAction("vendors.delete")) return;
    setVendorDeleteTarget(id);
  };

  const confirmDeleteVendor = async () => {
    if (!vendorDeleteTarget) return;
    try {
      await deleteVendor(vendorDeleteTarget).unwrap();
      toast.success("Vendor deleted successfully");
    } catch (error) {
      toast.error("Failed to delete vendor");
    } finally {
      setVendorDeleteTarget(null);
    }
  };

  const openVendorApprovalDialog = (vendor, action) => {
    if (!guardAction("vendors.approve")) return;
    setApprovalTarget({ vendor, action });
    setApprovalComments("");
  };

  const confirmVendorApprovalAction = async () => {
    if (!approvalTarget) return;

    try {
      await approveVendor({
        id: approvalTarget.vendor.id,
        body: {
          action: approvalTarget.action,
          comments: approvalComments.trim(),
        },
      }).unwrap();
      toast.success(
        `Vendor ${approvalTarget.action.toLowerCase()} successfully`,
      );
      setApprovalTarget(null);
      setApprovalComments("");
    } catch (error) {
      toast.error(
        error?.data?.detail ||
          error?.data?.message ||
          "Failed to update vendor approval",
      );
    }
  };

  const getStatusBadgeClass = (status) => {
    const normalizedStatus = formatWorkflowStatus(status);
    if (normalizedStatus === "Approved")
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (normalizedStatus === "Rejected")
      return "bg-red-100 text-red-800 border-red-200";
    if (normalizedStatus === "Saved")
      return "bg-slate-100 text-slate-800 border-slate-200";
    if (
      normalizedStatus === "Draft" ||
      normalizedStatus === NEEDS_CORRECTION_STATUS
    ) {
      return "bg-amber-100 text-amber-900 border-amber-200";
    }
    return "bg-amber-100 text-amber-800 border-amber-200";
  };

  const resetForm = () => {
    setEditingVendor(null);
    setFormData({
      vendorId: "",
      name: "",
      trade_name: "",
      vendor_type: "Company",
      email: "",
      phone: "",
      mobile: "",
      pan: "",
      gstin: "",
      gstRegistrations: [],
      vendorBranches: [],
      msme: false,
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
      bank_name: "",
      account_number: "",
      ifsc_code: "",
      branch: "",
      account_holder_name: "",
      category: "",
      currency: "INR",
      contact_person: "",
      website: "",
      notes: "",
      documents: createEmptyVendorDocuments(),
      tdsMapping: null,
      tdsCertificates: [],
      tdsDetailsEdited: false,

      ...NEW_VENDOR_FIELD_DEFAULTS,
    });
  };

  const vendorStats = useMemo(() => {
    const approved = vendors.filter(
      (vendor) => formatWorkflowStatus(vendor.status) === "Approved",
    ).length;
    const pendingApproval = vendors.filter((vendor) =>
      isPendingApprovalStatus(vendor.status),
    ).length;
    const saved = vendors.filter((vendor) =>
      isSavedVendorStatus(vendor.status),
    ).length;

    return {
      total: vendors.length,
      approved,
      pendingApproval,
      saved,
    };
  }, [vendors]);

  const vendorQuickFilters = [
    { value: "all", label: "All", count: vendorStats.total },
    { value: "approved", label: "Approved", count: vendorStats.approved },
    {
      value: "pending approval",
      label: "Pending Approval",
      count: vendorStats.pendingApproval,
    },
  ];

  const isEditingSavedVendor =
    Boolean(editingVendor) && isSavedVendorStatus(editingVendor?.status);

  const closeViewVendorPage = useCallback(() => {
    setViewingVendor(null);
    setViewVendorEditMode(false);
    clearNotificationQueryParams(searchParams, setSearchParams);
  }, [searchParams, setSearchParams]);

  const viewFormData = useMemo(
    () => buildVendorViewData(viewingVendor),
    [viewingVendor],
  );

  const filteredVendors = useMemo(() => {
    if (statusFilter === "approved") {
      return vendors.filter(
        (vendor) => formatWorkflowStatus(vendor.status) === "Approved",
      );
    }
    if (statusFilter === "pending approval") {
      return vendors.filter((vendor) => isPendingApprovalStatus(vendor.status));
    }
    return vendors;
  }, [vendors, statusFilter]);

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    typeFilter !== "all" ||
    statusFilter !== "all";

  const resetVendorFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setStatusFilter("all");
  };

  const vendorTotal = Number(vendorsData?.total ?? vendors.length);
  const vendorFilterSummary = `${filteredVendors.length} of ${vendorTotal} vendor${
    vendorTotal === 1 ? "" : "s"
  } shown`;

  const isPendingApprovalVendor = (vendor) =>
    isPendingApprovalStatus(vendor?.status);

  const notificationSource = searchParams.get("source");
  const notificationAction = searchParams.get("action");
  const notificationVendorId = searchParams.get("vendorId");
  const notificationFilter = searchParams.get("filter");
  const notificationWeakEntity = searchParams.get("weakEntity") === "1";

  useEffect(() => {
    if (
      notificationSource === "notification" &&
      notificationFilter === "pending-approval"
    ) {
      setStatusFilter("pending-approval");
    }
  }, [notificationFilter, notificationSource]);

  useEffect(() => {
    if (
      notificationSource !== "notification" ||
      notificationAction !== "preview" ||
      !notificationVendorId
    ) {
      return;
    }

    const notificationKey = `${notificationSource}:${notificationAction}:${notificationVendorId}`;
    if (handledNotificationRef.current === notificationKey) return;
    handledNotificationRef.current = notificationKey;

    const loadedVendor = vendors.find(
      (vendor) =>
        String(vendor?.id ?? vendor?.vendorId) === String(notificationVendorId),
    );

    if (loadedVendor) {
      setViewingVendor(loadedVendor);
      return;
    }

    if (notificationWeakEntity) {
      toast.warning(
        "Could not open the exact item. Showing the related module instead.",
      );
      return;
    }

    getVendor(notificationVendorId)
      .unwrap()
      .then((vendor) => {
        if (vendor?.id || vendor?.vendorId) {
          setViewingVendor(vendor);
          return;
        }
        toast.warning(
          "Could not open the exact item. Showing the related module instead.",
        );
      })
      .catch(() => {
        toast.warning(
          "Could not open the exact item. Showing the related module instead.",
        );
      });
  }, [
    getVendor,
    notificationAction,
    notificationSource,
    notificationVendorId,
    notificationWeakEntity,
    vendors,
  ]);

  useEffect(() => {
    setHideSidebar(
      singleVendorCreateOpen || viewVendorEditMode || Boolean(viewingVendor),
    );
    return () => setHideSidebar(false);
  }, [singleVendorCreateOpen, viewVendorEditMode, viewingVendor, setHideSidebar]);

  const vendorTypeOptions = useMemo(() => {
    const options = new Map([
      ["company", "Company"],
      ["individual", "Individual"],
    ]);
    vendors.forEach((vendor) => {
      const type = String(getVendorType(vendor)).trim();
      if (type) options.set(type.toLowerCase(), type);
    });
    return Array.from(options.values());
  }, [vendors]);

  const canCreateVendor = canPerformAction("vendors.create");
  const canEditVendorPermission = canUpdateVendorPermission;
  const canDeleteVendor = canPerformAction("vendors.delete");
  const canApproveVendor = canPerformAction("vendors.approve");
  const vendorsRefreshing = vendorsFetching;

  const handleRefreshVendors = async () => {
    try {
      await refetchVendors();
      toast.success("Vendors refreshed");
    } catch {
      toast.error("Failed to refresh vendors");
    }
  };

  const vendorsTableHeader = useMemo(
    () =>
      withIntegrationTableHeader(
        [
          {
            key: "vendorId",
            title: "Vendor ID",
            headerClassName: "bg-muted text-foreground",
            cellClassName: "text-xs text-muted-foreground whitespace-nowrap",
          },
          {
            key: "vendor",
            title: "Vendor",
            headerClassName: "bg-muted text-foreground",
          },
          {
            key: "type",
            title: "Vendor Type",
            headerClassName: "bg-muted text-foreground",
          },
          {
            key: "addressState",
            title: "Address/State",
            headerClassName: "bg-muted text-foreground",
          },
          {
            key: "updatedAt",
            title: "Last Modified",
            headerClassName: "bg-muted text-foreground",
            cellClassName: "text-xs text-muted-foreground whitespace-nowrap",
          },
          {
            key: "status",
            title: "Status",
            headerClassName: "bg-muted text-foreground",
          },
          {
            key: "actions",
            title: "Actions",
            headerClassName: "bg-muted text-foreground text-left",
          },
        ],
        showIntegrationColumn,
      ).map((column) =>
        column.key === "integration"
          ? { ...column, headerClassName: "bg-muted text-foreground" }
          : column,
      ),
    [showIntegrationColumn],
  );

  const renderVendorRow = (vendor, rowIndex, headers) => {
    const vendorId = vendor.id ?? rowIndex;

    return (
      <TableRow
        key={vendorId}
        className="cursor-pointer border-b border-border transition-colors hover:bg-muted/50"
        onClick={() => setViewingVendor(vendor)}
        data-testid={`vendor-row-${vendor?.id ?? "unknown"}`}
      >
        {headers.map((header) => {
            let value;

            switch (header.key) {
              case "vendorId":
                value = vendor.vendorId ?? "-";
                break;
              case "vendor":
                value = <div className="font-medium">{vendor.name}</div>;
                break;
              case "type":
                value = <div className="font-medium">{vendor.vendor_type || "Company"}</div>;
                break;
              case "addressState": {
                const addressStateValue = vendor.state || vendor.address_line1 || "-";
                value = (
                  <div
                    className="max-w-[220px] truncate"
                    title={addressStateValue !== "-" ? addressStateValue : undefined}
                  >
                    {addressStateValue}
                  </div>
                );
                break;
              }
              case "status":
                value = (
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(vendor.status)}`}
                  >
                    {formatWorkflowStatus(vendor.status) || "Pending Approval"}
                  </span>
                );
                break;
              case "pan":
                value = vendor.pan || "-";
                break;
              case "integration":
                value = <IntegrationSourceBadge record={vendor} />;
                break;
              case "updatedAt": {
                const updatedAt =
                  vendor.updatedAt ||
                  vendor.updated_at ||
                  vendor.createdAt ||
                  vendor.created_at;
                const updatedDate = updatedAt ? new Date(updatedAt) : null;
                value =
                  updatedDate && !Number.isNaN(updatedDate.getTime())
                    ? format(updatedDate, "dd MMM yy, hh:mm a")
                    : "-";
                break;
              }
              case "actions": {
                const showApprove =
                  canApproveVendor && isPendingApprovalVendor(vendor);
                const showEdit = canEditVendor(vendor, vendorEditContext);
                const showUnlock =
                  isAccountingReadyLocked(vendor) &&
                  canUpdateVendorPermission &&
                  String(
                    getAccountingUnlockRequestStatus(vendor) || "",
                  ).toUpperCase() !== "PENDING";
                const showMoreMenu = showApprove;
                const showPlainDelete = !showApprove && canDeleteVendor;

                value = (
                  <div
                    className="inline-flex justify-start items-center gap-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {showApprove && (
                      <Button
                        size="sm"
                        onClick={() =>
                          openVendorApprovalDialog(vendor, "Approved")
                        }
                        data-testid={`approve-vendor-${vendor?.id ?? "unknown"}`}
                      >
                        <CircleCheckBig className="h-4 w-4" />
                        Approve
                      </Button>
                    )}
                    {showEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(vendor)}
                        title={
                          formatWorkflowStatus(vendor.status) ===
                          NEEDS_CORRECTION_STATUS
                            ? "Edit vendor (creator)"
                            : "Edit vendor"
                        }
                        data-testid={`edit-vendor-${vendor?.id ?? "unknown"}`}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                    )}
                    {showUnlock && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 rounded-md"
                        onClick={() => handleRequestVendorUnlock(vendor)}
                        disabled={requestVendorUnlockLoading}
                        title="Request accounting unlock"
                        data-testid={`request-unlock-vendor-${vendor?.id ?? "unknown"}`}
                      >
                        <Unlock className="h-4 w-4 text-amber-700" />
                      </Button>
                    )}
                    {showMoreMenu && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0 rounded-md"
                            title="More actions"
                            data-testid={`vendor-more-actions-${vendor?.id ?? "unknown"}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              openVendorApprovalDialog(vendor, "Rejected")
                            }
                            className="text-destructive focus:text-destructive"
                            data-testid={`reject-vendor-${vendor?.id ?? "unknown"}`}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Reject
                          </DropdownMenuItem>
                          {canDeleteVendor && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(vendor.id)}
                              className="text-destructive focus:text-destructive"
                              data-testid={`delete-vendor-${vendor?.id ?? "unknown"}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {showPlainDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 rounded-md"
                        onClick={() => handleDelete(vendor.id)}
                        title="Delete vendor"
                        data-testid={`delete-vendor-${vendor?.id ?? "unknown"}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                );
                break;
              }
              default:
                value = "-";
            }

            const className = [
              "border border-table-border",
              header.cellClassName,
              header.key === "pan" ? "text-sm" : "",
              header.key === "actions" ? "text-left" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <TableCell key={header.key} className={className}>
                {value}
              </TableCell>
            );
          })}
      </TableRow>
    );
  };

  if (singleVendorCreateOpen) {
    return (
      <CreateVendorPage
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        onCancel={closeSingleVendorCreate}
        submitting={createVendorLoading}
      />
    );
  }

  if (viewVendorEditMode) {
    return (
      <CreateVendorPage
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        onCancel={() => {
          setViewVendorEditMode(false);
          setViewingVendor(null);
          resetForm();
        }}
        submitting={updateVendorLoading}
        title={isEditingSavedVendor ? "Complete Vendor" : "Edit Vendor"}
        subtitle={
          isEditingSavedVendor
            ? "Review imported vendor details, complete GSTIN and documents, then submit for approval."
            : "Update contact details and payment info of this vendor in OptiFii"
        }
        submitLabel={isEditingSavedVendor ? "Submit for Approval" : "Update Vendor"}
        submittingLabel={isEditingSavedVendor ? "Submitting…" : "Updating…"}
        testId="edit-vendor-page"
        isEditMode
      />
    );
  }

  if (viewingVendor) {
    return (
      <ViewVendorPage
        formData={viewFormData}
        onClose={closeViewVendorPage}
        onEdit={
          canEditVendor(viewingVendor, vendorEditContext)
            ? () => {
                if (loadVendorIntoForm(viewingVendor)) {
                  setViewVendorEditMode(true);
                }
              }
            : undefined
        }
      />
    );
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4"
      data-testid="vendors-page"
    >
      <div className="shrink-0 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className="text-3xl font-bold font-['Manrope'] text-primary md:text-4xl"
            data-testid="vendors-title"
          >
            Vendors
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage vendor legal entities and their GST registrations
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RefreshButton
            onClick={handleRefreshVendors}
            refreshing={vendorsRefreshing}
          >
            Refresh
          </RefreshButton>
          {canCreateVendor && (
            <div className="relative">
              <Button
                data-testid="new-vendor-button"
                onClick={() => setVendorUploadOptionOpen((prev) => !prev)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Vendor
              </Button>
              {vendorUploadOptionOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-border bg-background p-2 shadow-md">
                  <button
                    type="button"
                    className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={openSingleVendorCreate}
                  >
                    Single Vendor
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={openMultipleVendorDialog}
                  >
                    Multiple Vendors
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <MultipleVendorUploadDialog
        open={multipleVendorUploadOpen}
        onOpenChange={setMultipleVendorUploadOpen}
        onDownloadTemplate={downloadVendorTemplate}
        onDataParsed={handleBulkVendorUpload}
        disabled={createVendorLoading}
        expectedHeaders={VENDOR_UPLOAD_FIELDS}
        uploadHeaderMap={VENDOR_UPLOAD_HEADER_MAP}
        nonMandatoryFields={vendorUploadOptionalFields}
        customValidation={validateVendorUploadRow}
      />

      <BulkUploadReviewDialog
        open={bulkReviewOpen}
        onOpenChange={setBulkReviewOpen}
        data={bulkReviewData}
      />

      <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {vendorQuickFilters.map(({ value, label, count }) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={statusFilter === value ? "default" : "outline"}
              onClick={() => setStatusFilter(value)}
              data-testid={`vendor-filter-${value}`}
            >
              {label} ({count})
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search vendors by name, PAN, GSTIN, state, email, or phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-10"
              data-testid="vendor-search-input"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger
              className="h-9 w-full sm:w-40"
              data-testid="vendor-type-filter"
            >
              <SelectValue placeholder="Vendor type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {vendorTypeOptions.map((type) => (
                <SelectItem key={type} value={type.toLowerCase()}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TableSortButton
            options={vendorSortOptions}
            value={vendorSort.sortBy}
            direction={vendorSort.sortDirection}
            onChange={({ value, direction }) =>
              setVendorSort({ sortBy: value, sortDirection: direction })
            }
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex shrink-0 justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={resetVendorFilters}
          >
            Clear filters
          </Button>
        </div>
      )}

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
        data-testid="vendors-table"
      >
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto scrollbar-thin-muted">
          <AppDataTable
            tableHeader={vendorsTableHeader}
            tableData={filteredVendors}
            renderRow={renderVendorRow}
            isLoading={vendorsFetching}
            loadingRowCount={8}
            emptyMessage="No vendors found. Create your first vendor to get started!"
            emptyTestId="no-vendors"
            tableClassName="min-w-[1000px]"
            tableContainerClassName="overflow-visible"
            headClassName="border-b border-border bg-muted shadow-sm"
            stickyHeader
            striped={false}
            bordered
          />
        </div>
        <div className="mt-auto flex shrink-0 border-t border-border p-4">
          <p
            className="text-sm text-muted-foreground"
            data-testid="vendors-table-summary"
          >
            {!hasActiveFilters && filteredVendors.length === vendorTotal
              ? `Showing ${filteredVendors.length.toLocaleString("en-IN")} vendor${filteredVendors.length === 1 ? "" : "s"}`
              : `${vendorFilterSummary}`}
          </p>
        </div>
      </div>

      <DeleteVendorDialog
        open={Boolean(vendorDeleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteVendorLoading) setVendorDeleteTarget(null);
        }}
        onConfirm={confirmDeleteVendor}
        deleting={deleteVendorLoading}
      />

      <VendorApprovalDialog
        open={Boolean(approvalTarget)}
        onOpenChange={(open) => {
          if (!open && !approveVendorLoading) setApprovalTarget(null);
        }}
        approvalTarget={approvalTarget}
        approvalComments={approvalComments}
        onCommentsChange={setApprovalComments}
        onConfirm={confirmVendorApprovalAction}
        confirming={approveVendorLoading}
      />

    </div>
  );
};

export default Vendors;
