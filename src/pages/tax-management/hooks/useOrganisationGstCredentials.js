import { useGetOrganisationGstCredentialsQuery } from '../../../Services/apis/taxApi';

/**
 * Loads organisation GST registrations for Tax Management fetch forms.
 * API: GET /tax/gst/registrations
 */
export function useOrganisationGstCredentials({ enabled = true } = {}) {
  const {
    data: credentials = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetOrganisationGstCredentialsQuery(undefined, { skip: !enabled });

  return {
    credentials,
    isLoading: isLoading || isFetching,
    isError,
    hasCredentials: credentials.length > 0,
    refetch,
  };
}
