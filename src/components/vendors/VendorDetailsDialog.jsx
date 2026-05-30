import React from 'react';
import { Building2, User } from 'lucide-react';
import { isIndiaCountry, normalizePincodeInput } from '../../utils/vendorValidation';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const CATEGORY_OPTIONS = [
  'IT Services',
  'Office Supplies',
  'Consulting',
  'Marketing',
  'Legal',
  'Maintenance',
  'Utilities',
  'Others',
];

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
];

const VendorDetailsDialog = ({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  title = 'Create Vendor',
  description = 'Add contact details and payment info of your vendor in OptiFii',
  submitLabel = 'Save Vendor',
  submitting = false,
  requireEmail = true,
  requireFullMandatory = false,
  /** Invoice upload vendor request: GSTIN + mobile only; PAN optional */
  invoiceVendorRequest = false,
  testId = 'vendor-dialog',
}) => {
  if (!formData) return null;
  const isEmailRequired = requireEmail || requireFullMandatory;
  const isIndia = isIndiaCountry(formData.country);
  const isGstinRequired = invoiceVendorRequest || isIndia;
  const isPanRequired = isIndia && !invoiceVendorRequest;
  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const basicInfoFields = [
    { key: 'email', label: 'Email', type: 'email', placeholder: 'vendor@example.com', required: isEmailRequired, testId: 'vendor-email-input' },
    { key: 'mobile', label: 'Mobile Number', placeholder: '+91 98765 43210', required: true, testId: 'vendor-mobile-input' },
    { key: 'phone', label: 'Phone Number', placeholder: '+91 22 1234 5678', required: false, testId: 'vendor-phone-input' },
    { key: 'contact_person', label: 'Contact Person', placeholder: 'e.g., Rahul Sharma', required: requireFullMandatory },
    { key: 'website', label: 'Website', placeholder: 'https://example.com' },
  ];

  const addressFields = [
    { key: 'address_line1', label: 'Address Line 1', placeholder: 'Building/Street address', required: requireFullMandatory, colSpan: 'col-span-2' },
    { key: 'address_line2', label: 'Address Line 2', placeholder: 'Apartment, suite, etc.', required: requireFullMandatory, colSpan: 'col-span-2' },
    { key: 'city', label: 'City', placeholder: 'e.g., Mumbai', required: requireFullMandatory },
    { key: 'state', label: 'State', placeholder: 'e.g., Maharashtra', required: requireFullMandatory },
    { key: 'country', label: 'Country', placeholder: 'India', required: requireFullMandatory },
  ];

  const bankFields = [
    { key: 'account_holder_name', label: 'Account Holder Name', placeholder: 'As per bank records', colSpan: 'col-span-2' },
    { key: 'account_number', label: 'Account Number', placeholder: '1234567890' },
    { key: 'ifsc_code', label: 'IFSC Code', placeholder: 'ICIC0001234', transform: (value) => value.toUpperCase(), className: 'uppercase' },
    { key: 'bank_name', label: 'Bank Name', placeholder: 'e.g., ICICI Bank' },
    { key: 'branch', label: 'Branch', placeholder: 'e.g., Andheri West' },
  ];

  const renderInputField = ({
    key,
    label,
    placeholder,
    required = false,
    type = 'text',
    transform,
    className = '',
    colSpan = '',
    maxLength,
    testId,
  }) => (
    <div key={key} className={colSpan}>
      <Label>{label}{required ? ' *' : ''}</Label>
      <Input
        type={type}
        value={formData[key] || ''}
        onChange={(event) => updateField(key, transform ? transform(event.target.value) : event.target.value)}
        placeholder={placeholder}
        required={required}
        className={className}
        maxLength={maxLength}
        data-testid={testId}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="tax">Tax Info</TabsTrigger>
              <TabsTrigger value="bank">Bank Details</TabsTrigger>
              <TabsTrigger value="additional">Additional</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Vendor Type *</Label>
                  <div className="flex gap-4 mt-2">
                    {['Company', 'Individual'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, vendor_type: type }))}
                        className={`flex-1 p-4 border-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                          formData.vendor_type === type
                            ? 'border-accent bg-accent/10'
                            : 'border-border hover:border-accent/50'
                        }`}
                      >
                        {type === 'Company' ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
                        <span className="font-medium">{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <Label>{formData.vendor_type === 'Company' ? 'Company Name' : 'Full Name'} *</Label>
                  <Input
                    value={formData.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    placeholder={formData.vendor_type === 'Company' ? 'e.g., Acme Corporation' : 'e.g., John Doe'}
                    data-testid="vendor-name-input"
                    required
                  />
                </div>

                {basicInfoFields.map(renderInputField)}

                <div>
                  <Label>Category</Label>
                  <select
                    value={formData.category}
                    onChange={(event) => updateField('category', event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select Category</option>
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Currency</Label>
                  <select
                    value={formData.currency}
                    onChange={(event) => updateField('currency', event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {CURRENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {addressFields.map(renderInputField)}

                <div>
                  <Label>
                    {isIndia ? 'Pincode' : 'Postal Code'}
                    {requireFullMandatory ? ' *' : ''}
                  </Label>
                  <Input
                    type="text"
                    inputMode={isIndia ? 'numeric' : 'text'}
                    value={formData.pincode || ''}
                    onChange={(event) =>
                      updateField(
                        'pincode',
                        normalizePincodeInput(event.target.value, formData.country),
                      )
                    }
                    placeholder={
                      isIndia ? 'e.g., 400001' : 'e.g., 10001 or SW1A 1AA'
                    }
                    required={requireFullMandatory}
                    maxLength={isIndia ? 6 : undefined}
                    data-testid="vendor-pincode-input"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {isIndia
                      ? 'Enter a 6-digit pincode for India'
                      : 'Enter the postal code for the selected country'}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tax" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div key="pan">
                  <Label>PAN Number{isPanRequired ? ' *' : ''}</Label>
                  <Input
                    value={formData.pan}
                    onChange={(event) => updateField('pan', event.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    className="uppercase"
                    required={isPanRequired}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    10-digit alphanumeric PAN number
                  </p>
                </div>

                <div>
                  <Label>GSTIN{isGstinRequired ? ' *' : ''}</Label>
                  <Input
                    value={formData.gstin}
                    onChange={(event) => updateField('gstin', event.target.value.toUpperCase())}
                    placeholder="29ABCDE1234F1Z5"
                    maxLength={15}
                    className="uppercase"
                    required={isGstinRequired}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    15-digit GST Identification Number
                  </p>
                </div>

              </div>
            </TabsContent>

            <TabsContent value="bank" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                {bankFields.map(renderInputField)}
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-900 mt-4">
                <h4 className="font-semibold mb-2 text-amber-900 dark:text-amber-100">
                  Warning: Bank Details Security
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  To modify vendor's bank details, you need to delete and re-enter the information. This ensures payment security and prevents unauthorized changes.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="additional" className="space-y-4 mt-4">
              <div>
                <Label>Notes</Label>
                <textarea
                  value={formData.notes}
                  onChange={(event) => updateField('notes', event.target.value)}
                  className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Add any additional notes or special instructions..."
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" data-testid="vendor-submit-button" disabled={submitting}>
              {submitting ? 'Saving...' : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VendorDetailsDialog;
