import React from "react";
import { VENDOR_FIELD_SECTIONS } from "../../../../utils/vendorFieldConfig";

const NotesSection = ({ notes, onNotesChange, isRequired }) => (
  <div className="-mx-6 border-b border-border px-10">
    <div className="flex flex-col items-start self-stretch border-b border-border py-6">
      <h3 className="font-['Manrope'] text-lg font-semibold leading-6 text-foreground">
        Notes
      </h3>
    </div>

    <div className="flex flex-col items-start gap-1.5 px-4 py-8">
      <textarea
        value={notes || ""}
        onChange={(event) => onNotesChange(event.target.value)}
        className="min-h-[96px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        placeholder="Special instructions, payment preferences, or internal remarks…"
        required={isRequired(VENDOR_FIELD_SECTIONS.REMARKS)}
      />
    </div>
  </div>
);

export default NotesSection;
