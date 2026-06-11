import React from 'react';
import VendorDetailsDialog from '../../../components/vendors/VendorDetailsDialog';

const RequestVendorDialog = (props) => (
  <VendorDetailsDialog
    {...props}
    title="Request Vendor Addition"
    description="Enter vendor details for approval. Only vendor name and vendor type are required."
    submitLabel="Submit Request"
    invoiceVendorRequest
    testId="request-vendor-dialog"
  />
);

export default RequestVendorDialog;
