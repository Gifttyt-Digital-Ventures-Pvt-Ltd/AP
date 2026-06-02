export const normalizeInvoiceMandatoryFields = (response) => {
  const payload = response?.data ?? response ?? {};

  return {
    department: payload.department === true,
    category: payload.category === true,
  };
};

export const getInvoiceMandatoryFieldValidationMessage = (
  payload,
  { department = false, category = false } = {},
  { showCategoryField = true } = {},
) => {
  if (!payload) return null;

  if (department && !payload.departmentId) {
    return 'Please select a department before creating invoice';
  }

  if (showCategoryField && category) {
    const categoryId = payload.categoryId || payload.category?.id;
    if (!categoryId) {
      return 'Please select a category before creating invoice';
    }
  }

  return null;
};

export const isInvoiceMandatoryFieldsSatisfied = (
  payload,
  mandatoryFields,
  options = {},
) => !getInvoiceMandatoryFieldValidationMessage(payload, mandatoryFields, options);
