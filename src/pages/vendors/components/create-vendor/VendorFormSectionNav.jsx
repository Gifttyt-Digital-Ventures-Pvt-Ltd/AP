import React, { useState } from "react";

const SCROLL_OFFSET = 16;

const scrollToSection = (id, containerRef) => {
  const container = containerRef?.current;
  const element = document.getElementById(id);
  if (!element) return;

  if (!container) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const nextScrollTop =
    container.scrollTop + (elementRect.top - containerRect.top) - SCROLL_OFFSET;

  container.scrollTo({ top: Math.max(nextScrollTop, 0), behavior: "smooth" });
};

const VendorFormSectionNav = ({ sections = [], scrollContainerRef }) => {
  const [activeId, setActiveId] = useState(sections[0]?.id || "");

  const handleNavigate = (id) => {
    setActiveId(id);
    scrollToSection(id, scrollContainerRef);
  };

  return (
    <nav
      className="flex h-full w-full flex-col items-start overflow-y-auto border-r border-border pb-16 pl-16 pr-20 pt-6"
      data-testid="vendor-form-section-nav"
    >
      <div className="flex flex-col items-start">
        {sections.map((section) => {
          const children = Array.isArray(section.children) ? section.children : [];
          const isSectionActive = activeId === section.id;
          const sectionTextColorClass = isSectionActive ? "text-button-primary" : "text-foreground";
          const headerWeightClass = isSectionActive
            ? "font-semibold"
            : section.headerWeight === "medium"
              ? "font-medium"
              : "font-semibold";

          return (
            <div key={section.id} className="flex flex-col items-start self-stretch">
              <button
                type="button"
                onClick={() => handleNavigate(section.id)}
                className={`flex items-center gap-2 py-2 pl-2 text-left font-['Manrope'] text-lg leading-6 ${headerWeightClass} ${sectionTextColorClass}`}
                data-testid={`vendor-form-nav-${section.id}`}
              >
                {section.label}
              </button>

              {children.length > 0 ? (
                <div className="flex items-start gap-2 self-stretch">
                  <div className="flex items-center gap-6 self-stretch px-3.5">
                    <div className="w-px self-stretch bg-table-border" />
                  </div>
                  <div className="flex flex-col items-start gap-7 pb-[18px] pt-3">
                    {children.map((child) => {
                      const isChildActive = activeId === child.id;
                      const childTextColorClass = isChildActive
                        ? "text-button-primary"
                        : "text-foreground";
                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => handleNavigate(child.id)}
                          className={`text-left font-['Manrope'] text-base font-medium leading-6 ${childTextColorClass}`}
                          data-testid={`vendor-form-nav-${child.id}`}
                        >
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex h-8 items-start gap-2 self-stretch">
                  <div className="flex items-center gap-6 self-stretch px-3.5">
                    <div className="w-px self-stretch bg-table-border" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default VendorFormSectionNav;
