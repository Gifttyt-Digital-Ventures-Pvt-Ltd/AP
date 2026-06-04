# Vendor Backend Payload Keys

These are the actual keys sent to backend for vendor create/update payloads.

## Required Keys

- `name`
- `vendorType`
- `email`
- `mobile`
- `phone`
- `contactPerson`
- `addressLine1`
- `addressLine2`
- `city`
- `state`
- `pincode`
- `country`
- `pan`
- `gstin`

## Optional Keys

- `category`
- `website`
- `currency`
- `accountHolderName`
- `accountNumber`
- `ifscCode`
- `bankName`
- `branch`
- `notes`
- `paymentTerms`

## Example Vendor Object

```json
{
  "name": "Vendor A",
  "vendorType": "Company",
  "email": "vendora@example.com",
  "mobile": "9876543210",
  "phone": "02212345678",
  "contactPerson": "A Person",
  "addressLine1": "Address 1",
  "addressLine2": "Address 2",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "country": "India",
  "pan": "ABCDE1234F",
  "gstin": "29ABCDE1234F1Z5",
  "category": "Services",
  "website": "https://example.com",
  "currency": "INR",
  "accountHolderName": "Vendor A Pvt Ltd",
  "accountNumber": "1234567890",
  "ifscCode": "HDFC0001234",
  "bankName": "HDFC Bank",
  "branch": "Andheri",
  "notes": "Preferred vendor",
  "paymentTerms": "30"
}
```

