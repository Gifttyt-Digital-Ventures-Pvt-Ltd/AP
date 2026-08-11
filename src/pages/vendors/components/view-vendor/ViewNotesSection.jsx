import React from "react";
import { ReadOnlyValue } from "./ReadOnlyField";

const ViewNotesSection = ({ notes }) => (
  <div className="-mx-6 border-b border-border px-10">
    <div className="flex flex-col items-start self-stretch border-b border-border py-6">
      <h3 className="font-['Manrope'] text-lg font-semibold leading-6 text-foreground">
        Notes
      </h3>
    </div>

    <div className="flex flex-col items-start gap-1.5 px-4 py-8">
      <ReadOnlyValue value={notes} placeholder="No notes added." className="w-full" />
    </div>
  </div>
);

export default ViewNotesSection;
