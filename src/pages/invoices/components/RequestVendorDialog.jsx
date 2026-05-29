import React from 'react';
import VendorDetailsDialog from '../../../components/vendors/VendorDetailsDialog';

const RequestVendorDialog = (props) => (
  <VendorDetailsDialog
    {...props}
    title="Request Vendor Addition"
    description="Enter vendor details for approval. Vendor name, type, mobile number, and GSTIN are required."
    submitLabel="Submit Request"
    requireEmail={false}
    invoiceVendorRequest
    testId="request-vendor-dialog"
  />
);

export default RequestVendorDialog;
