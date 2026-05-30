import React, { useMemo } from 'react';
import { Loader2, UserCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRBAC } from '../../contexts/RBACContext';
import {
  useGetCorporateUserDetailsQuery,
  useGetEmployeeCustomRolesQuery,
} from '../../Services/apis/corporateApi';
import { buildCurrentUserIdentity } from '../../utils/approvalWorkflow';
import { PERMISSION_LABELS } from '../user-roles/constants/permissionConfig';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

const normalizeAssignedRoles = (assignedRoles) => {
  if (Array.isArray(assignedRoles)) {
    return assignedRoles.map((role) => String(role || '').trim()).filter(Boolean);
  }
  if (typeof assignedRoles === 'string') {
    return assignedRoles
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean);
  }
  return [];
};

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const resolveDepartmentName = (employeeDetails) => {
  const department = employeeDetails?.department;
  if (department && typeof department === 'object') {
    return (
      department.name ||
      department.departmentName ||
      department.department_name ||
      ''
    );
  }
  return employeeDetails?.departmentName || (typeof department === 'string' ? department : '');
};

const resolveEmployeeCode = (employeeDetails, corporateUser) =>
  employeeDetails?.empId ||
  employeeDetails?.employeeCode ||
  corporateUser?.empId ||
  '';

const ACCOUNT_TYPE_LABELS = {
  CORPORATE_USER: 'Corporate User',
  CORPORATE_ADMIN: 'Corporate Admin',
  CORP_ADMIN: 'Corporate Admin',
  CORPADMIN: 'Corporate Admin',
  ADMIN: 'Corporate Admin',
  EMPLOYEE: 'Employee',
};

const ROLE_LABELS = {
  CORP_ADMIN: 'Corporate Admin',
  CORPADMIN: 'Corporate Admin',
  CORPORATE_ADMIN: 'Corporate Admin',
  ADMIN: 'Corporate Admin',
  CHECKER: 'Checker',
  APPROVER: 'Approver',
  MAKER: 'Maker',
  ACCOUNTANT: 'Accountant',
};

const normalizeProfileToken = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    const nested = value.name ?? value.role ?? value.label ?? value.value;
    return normalizeProfileToken(nested);
  }

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const formatProfileLabel = (value) => {
  const token = normalizeProfileToken(value);
  if (!token) return '';

  if (ACCOUNT_TYPE_LABELS[token]) return ACCOUNT_TYPE_LABELS[token];
  if (ROLE_LABELS[token]) return ROLE_LABELS[token];

  return token
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
};

const resolveAccountType = ({ corporateUserContext, corporateUser, user, isCorporateAdmin }) => {
  if (isCorporateAdmin) return 'Corporate Admin';

  const rawValue =
    corporateUserContext?.type || corporateUser?.role || user?.role;

  return formatProfileLabel(rawValue) || '-';
};

const resolveEffectiveRole = ({ corporateUserContext, corporateUser, user, isCorporateAdmin }) => {
  if (isCorporateAdmin) return 'Corporate Admin';

  const rawValue =
    corporateUserContext?.effectiveRole ||
    corporateUser?.role ||
    user?.role;

  return formatProfileLabel(rawValue) || '-';
};

const DetailField = ({ label, value }) => (
  <div className="space-y-1">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-sm font-medium">{displayValue(value)}</p>
  </div>
);

const Profile = () => {
  const { user } = useAuth();
  const { isCorporateAdmin } = useRBAC();
  const {
    data: corporateUserContext = null,
    isLoading: userDetailsLoading,
    isError: userDetailsError,
  } = useGetCorporateUserDetailsQuery();

  const corporateUser = corporateUserContext?.corporateUser;
  const employeeDetails = corporateUserContext?.employeeDetails;

  const employeeId =
    employeeDetails?.id ??
    employeeDetails?.employeeId ??
    employeeDetails?.optifiiUserId ??
    null;

  const { data: customRolesContext = null, isLoading: customRolesLoading } =
    useGetEmployeeCustomRolesQuery(employeeId, {
      skip: !employeeId,
    });

  const identity = useMemo(
    () => buildCurrentUserIdentity({ user, corporateUserContext }),
    [user, corporateUserContext],
  );

  const assignedRoles = useMemo(
    () => normalizeAssignedRoles(employeeDetails?.assignedRoles),
    [employeeDetails?.assignedRoles],
  );

  const permissionLabels = useMemo(() => {
    const permissions = customRolesContext?.canonicalPermissions || [];
    return permissions.map(
      (permission) => PERMISSION_LABELS[permission] || permission,
    );
  }, [customRolesContext?.canonicalPermissions]);

  const employeeFullName = [employeeDetails?.firstName, employeeDetails?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  const isLoading = userDetailsLoading;
  const profileName =
    identity.userName ||
    corporateUser?.name ||
    corporateUser?.userName ||
    employeeFullName ||
    user?.name ||
    'User';
  const profileEmail =
    identity.userEmail ||
    corporateUser?.email ||
    employeeDetails?.email ||
    user?.email ||
    '';

  return (
    <div data-testid="profile-page">
      <div className="mb-8">
        <h1
          className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary mb-2"
          data-testid="profile-title"
        >
          Profile
        </h1>
        <p className="text-muted-foreground">Your account details</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading profile...
        </div>
      ) : userDetailsError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Unable to load profile details. Please try again later.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserCircle2 className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <CardTitle className="truncate text-xl">{profileName}</CardTitle>
                <p className="truncate text-sm text-muted-foreground">{profileEmail || '-'}</p>
              </div>
              {isCorporateAdmin ? (
                <Badge className="ml-auto shrink-0" variant="secondary">
                  Corporate Admin
                </Badge>
              ) : null}
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetailField label="Full Name" value={profileName} />
              <DetailField label="Email" value={profileEmail} />
              {!isCorporateAdmin ? (
                <>
                  <DetailField
                    label="Employee ID"
                    value={resolveEmployeeCode(employeeDetails, corporateUser)}
                  />
                  <DetailField label="Department" value={resolveDepartmentName(employeeDetails)} />
                  <DetailField
                    label="Designation"
                    value={employeeDetails?.designation || employeeDetails?.jobTitle}
                  />
                  <DetailField
                    label="Mobile"
                    value={employeeDetails?.mobile || employeeDetails?.phone}
                  />
                </>
              ) : null}
              <DetailField
                label="Account Type"
                value={resolveAccountType({
                  corporateUserContext,
                  corporateUser,
                  user,
                  isCorporateAdmin,
                })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Roles & Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailField
                label="Effective Role"
                value={resolveEffectiveRole({
                  corporateUserContext,
                  corporateUser,
                  user,
                  isCorporateAdmin,
                })}
              />

              {assignedRoles.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Assigned Roles</p>
                  <div className="flex flex-wrap gap-2">
                    {assignedRoles.map((role) => (
                      <Badge key={role} variant="outline">
                        {formatProfileLabel(role) || role}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {employeeId ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Permissions</p>
                  {customRolesLoading ? (
                    <p className="text-sm text-muted-foreground">Loading permissions...</p>
                  ) : permissionLabels.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {permissionLabels.map((label) => (
                        <Badge key={label} variant="secondary">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  ) : isCorporateAdmin ? (
                    <Badge variant="secondary">Full Access</Badge>
                  ) : (
                    <p className="text-sm text-muted-foreground">No custom role permissions assigned.</p>
                  )}
                </div>
              ) : isCorporateAdmin ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Permissions</p>
                  <Badge variant="secondary">Full Access</Badge>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Profile;
