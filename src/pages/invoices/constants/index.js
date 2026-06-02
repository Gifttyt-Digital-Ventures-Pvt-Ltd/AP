export const GST_TREATMENTS = [
  { value: "N/A", label: "N/A" },
  { value: "Regular", label: "Regular" },
  { value: "Composition", label: "Composition" },
  { value: "Unregistered", label: "Unregistered" },
  { value: "Consumer", label: "Consumer" },
  { value: "Overseas", label: "Overseas" },
  { value: "SEZ", label: "Special Economic Zone" },
];

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
  "Chandigarh",
];

export const TAX_RATES = [
  { value: "CGST + SGST 5%", label: "CGST + SGST 5%", cgst: 2.5, sgst: 2.5 },
  { value: "CGST + SGST 12%", label: "CGST + SGST 12%", cgst: 6, sgst: 6 },
  { value: "CGST + SGST 18%", label: "CGST + SGST 18%", cgst: 9, sgst: 9 },
  { value: "CGST + SGST 28%", label: "CGST + SGST 28%", cgst: 14, sgst: 14 },
  { value: "IGST 5%", label: "IGST 5%", igst: 5 },
  { value: "IGST 12%", label: "IGST 12%", igst: 12 },
  { value: "IGST 18%", label: "IGST 18%", igst: 18 },
  { value: "IGST 28%", label: "IGST 28%", igst: 28 },
  { value: "Exempt", label: "Exempt", cgst: 0, sgst: 0 },
];

export const INVOICE_SOURCES = [
  { value: "Upload", label: "Upload" },
  { value: "Email", label: "Email" },
];
export const LEDGER_OPTIONS = [
  "Cloud Services",
  "Software Subscription",
  "Professional Services",
  "Office Supplies",
  "Travel & Conveyance",
  "Rent",
  "Utilities",
  "Marketing & Advertising",
  "Legal & Professional",
  "Maintenance",
];

export const INVOICE_LIST_FILTERS = [
  { value: "all", label: "All" },
  { value: "saved", label: "Saved" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
];

export const INVOICE_LIST_PAGE_SIZE = 20;
