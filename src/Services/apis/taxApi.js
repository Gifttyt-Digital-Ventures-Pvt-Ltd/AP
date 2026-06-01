import { serviceApi } from "../serviceApi";

export const taxApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getGstEntries: builder.query({
      query: () => ({ url: "/tax/gst/entries", method: "GET" }),
      providesTags: ["Tax"],
    }),
    getGstSummary: builder.query({
      query: () => ({ url: "/tax/gst/summary", method: "GET" }),
      providesTags: ["Tax"],
    }),
    getTdsEntries: builder.query({
      query: () => ({ url: "/tax/tds/entries", method: "GET" }),
      providesTags: ["Tax"],
    }),
    getTdsSummary: builder.query({
      query: () => ({ url: "/tax/tds/summary", method: "GET" }),
      providesTags: ["Tax"],
    }),
    getTdsSections: builder.query({
      query: () => ({ url: "/tax/tds/sections", method: "GET" }),
      providesTags: ["Tax"],
    }),
    calculateGst: builder.mutation({
      query: (body) => ({
        url: "/tax/gst/calculate",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Tax"],
    }),
    calculateTds: builder.mutation({
      query: (body) => ({
        url: "/tax/tds/calculate",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Tax"],
    }),
    generateForm16a: builder.mutation({
      query: (body) => ({ url: "/tax/tds/form16a", method: "POST", body }),
      invalidatesTags: ["Tax"],
    }),
  }),
});

export const {
  useGetGstEntriesQuery,
  useGetGstSummaryQuery,
  useGetTdsEntriesQuery,
  useGetTdsSummaryQuery,
  useGetTdsSectionsQuery,
  useCalculateGstMutation,
  useCalculateTdsMutation,
  useGenerateForm16aMutation,
} = taxApi;
