import { serviceApi } from "../serviceApi";
import { CREDIT_INVALIDATION_TAGS } from "../../constants/creditActions";

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
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
    }),
    calculateTds: builder.mutation({
      query: (body) => ({
        url: "/tax/tds/calculate",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
    }),
    generateForm16a: builder.mutation({
      query: (body) => ({ url: "/tax/tds/form16a", method: "POST", body }),
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
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
