import { serviceApi } from "../serviceApi";

export const vendorAdvancesApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    createVendorAdvance: builder.mutation({
      query: (body) => ({
        url: "/vendor-advances",
        method: "POST",
        body,
      }),
      invalidatesTags: ["VendorAdvances"],
    }),
  }),
});

export const {
  useCreateVendorAdvanceMutation,
} = vendorAdvancesApi;
