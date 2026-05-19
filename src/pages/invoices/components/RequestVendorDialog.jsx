import React from 'react';
import VendorDetailsDialog from '../../../components/vendors/VendorDetailsDialog';

const RequestVendorDialog = (props) => (
  <VendorDetailsDialog
    {...props}
    title="Request Vendor Addition"
    description="Enter vendor details for approval. Name, vendor type, and GSTIN are mandatory."
    submitLabel="Submit Request"
    requireEmail={false}
    requireGstin
    testId="request-vendor-dialog"
  />
);

export default RequestVendorDialog;
