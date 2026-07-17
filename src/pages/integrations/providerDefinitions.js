export const INTEGRATION_CATEGORY = {
  EMAIL: "EMAIL",
  ERP: "ERP",
};

export const integrationProviders = [
  {
    id: "gmail",
    name: "Gmail",
    category: INTEGRATION_CATEGORY.EMAIL,
    route: "/integrations/gmail",
  },
  {
    id: "zoho",
    name: "Zoho Books",
    category: INTEGRATION_CATEGORY.ERP,
    route: "/integrations/erp/zoho",
    provider: "ZOHO_BOOKS",
  },
  {
    id: "tally",
    name: "Tally",
    category: INTEGRATION_CATEGORY.ERP,
    route: "/integrations/erp/tally",
    provider: "TALLY",
  },
];

export const providerRoutes = {
  overview: "/integrations",
  gmail: "/integrations/gmail",
  zoho: "/integrations/erp/zoho",
  tally: "/integrations/erp/tally",
};
