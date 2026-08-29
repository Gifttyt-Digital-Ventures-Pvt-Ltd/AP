export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount || 0);

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatRetPeriod = (retPrd) => {
  const normalizedPeriod = String(retPrd || '').trim();
  if (!normalizedPeriod) return '-';
  if (!/^\d{6}$/.test(normalizedPeriod)) return normalizedPeriod;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = parseInt(normalizedPeriod.slice(0, 2), 10);
  const yearPart = normalizedPeriod.slice(2);
  const year = yearPart.length === 4 ? yearPart : `20${yearPart}`;
  return `${monthNames[month - 1] || normalizedPeriod.slice(0, 2)} ${year}`;
};

export const formatLakhs = (amountInLakhs) => `₹${Number(amountInLakhs || 0).toFixed(2)}L`;

export const formatLakhsFromRupees = (amount) =>
  `₹${(Number(amount || 0) / 100000).toFixed(2)}L`;

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
];
