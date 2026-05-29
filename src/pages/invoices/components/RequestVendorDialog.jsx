import React from 'react';
import VendorDetailsDialog from '../../../components/vendors/VendorDetailsDialog';

const RequestVendorDialog = (props) => (
  <VendorDetailsDialog
    {...props}
    title="Request Vendor Addition"
    description="Enter vendor details for approval. Name, vendor type, and mobile are mandatory. PAN and GSTIN are required when country is India."
    submitLabel="Submit Request"
    requireEmail={false}
    testId="request-vendor-dialog"
  />
);

export default RequestVendorDialog;
