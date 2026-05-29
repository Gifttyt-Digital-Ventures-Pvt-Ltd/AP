export const normalizeInvoiceMandatoryFields = (response) => ({
  department: response?.department === true,
  category: response?.category === true,
});

export const getInvoiceMandatoryFieldValidationMessage = (
  payload,
  { department = false, category = false } = {},
  { showCategoryField = true } = {},
) => {
  if (!payload) return null;

  if (department && !payload.department_id) {
    return 'Please select a department before creating invoice';
  }

  if (showCategoryField && category) {
    const categoryId = payload.category_id || payload.category?.id;
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
