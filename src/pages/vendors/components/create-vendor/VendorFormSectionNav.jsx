import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const SCROLL_OFFSET = 16;
// How long to ignore scroll-spy updates after a nav click, so the smooth-scroll
// animation settling on the clicked target doesn't get overridden mid-flight by
// whatever section happens to be passing the scroll-spy line at that moment —
// this also keeps the accordion from rapidly expanding/collapsing through every
// section the scroll passes on the way to the clicked one.
const CLICK_SUPPRESS_MS = 700;

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

const flattenSectionIds = (sections) =>
  sections.flatMap((section) => [
    section.id,
    ...(Array.isArray(section.children) ? section.children.map((child) => child.id) : []),
  ]);

const VendorFormSectionNav = ({ sections = [], scrollContainerRef }) => {
  const [activeId, setActiveId] = useState(sections[0]?.id || "");
  const suppressSpyRef = useRef(false);
  const suppressTimeoutRef = useRef(null);

  const handleNavigate = (id) => {
    setActiveId(id);
    scrollToSection(id, scrollContainerRef);

    suppressSpyRef.current = true;
    if (suppressTimeoutRef.current) clearTimeout(suppressTimeoutRef.current);
    suppressTimeoutRef.current = setTimeout(() => {
      suppressSpyRef.current = false;
    }, CLICK_SUPPRESS_MS);
  };

  // Scroll-spy: highlight whichever section/subsection has most recently
  // scrolled past the top of the content pane, so the sidebar tracks what the
  // user is actually looking at, not just the last thing they clicked. Which
  // section is expanded is derived directly from this — an accordion, not a
  // separately-tracked toggle: whatever owns activeId is open, everything
  // else stays collapsed.
  useEffect(() => {
    const container = scrollContainerRef?.current;
    const sectionIds = flattenSectionIds(sections);
    if (!container || sectionIds.length === 0) return undefined;

    let rafId = null;

    const updateActiveFromScroll = () => {
      rafId = null;
      if (suppressSpyRef.current) return;

      const containerTop = container.getBoundingClientRect().top;
      let currentId = sectionIds[0];

      for (const id of sectionIds) {
        const element = document.getElementById(id);
        if (!element) continue;
        const elementTop = element.getBoundingClientRect().top - containerTop;
        if (elementTop <= SCROLL_OFFSET) {
          currentId = id;
        } else {
          break;
        }
      }

      setActiveId((prev) => (prev === currentId ? prev : currentId));
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(updateActiveFromScroll);
    };

    updateActiveFromScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [sections, scrollContainerRef]);

  useEffect(
    () => () => {
      if (suppressTimeoutRef.current) clearTimeout(suppressTimeoutRef.current);
    },
    [],
  );

  return (
    <nav
      className="flex h-full w-full flex-col items-start overflow-y-auto border-r border-border pb-16 pl-16 pr-20 pt-6"
      data-testid="vendor-form-section-nav"
    >
      <div className="flex flex-col items-start">
        {sections.map((section, sectionIndex) => {
          const children = Array.isArray(section.children) ? section.children : [];
          const hasChildren = children.length > 0;
          const isLastSection = sectionIndex === sections.length - 1;
          const isSectionActive =
            activeId === section.id || children.some((child) => child.id === activeId);
          const isExpanded = !hasChildren || isSectionActive;
          const sectionHighlightClass = isSectionActive
            ? "text-button-primary"
            : "text-foreground";

          return (
            <div key={section.id} className="flex flex-col items-start self-stretch">
              <button
                type="button"
                onClick={() => handleNavigate(section.id)}
                className={`flex items-center gap-2 rounded-md py-2 pl-2 pr-3 text-left font-['Manrope'] text-lg font-semibold leading-6 transition-colors ${sectionHighlightClass}`}
                data-testid={`vendor-form-nav-${section.id}`}
              >
                {section.label}
                {hasChildren ? (
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform duration-300 ease-in-out ${
                      isExpanded ? "rotate-180" : "rotate-0"
                    }`}
                  />
                ) : null}
              </button>

              {hasChildren ? (
                <>
                  {/* Always-visible stub — not inside the collapsing grid below,
                      so the connector line never fully disappears when this
                      section collapses (grid-rows-[0fr] + overflow-hidden would
                      otherwise clip everything inside it to 0, line included). */}
                  <div className="flex h-4 items-start gap-2 self-stretch">
                    <div className="flex items-center gap-6 self-stretch px-3.5">
                      <div className="w-px self-stretch bg-table-border" />
                    </div>
                  </div>

                  <div
                    className={`grid w-full self-stretch transition-[grid-template-rows] duration-300 ease-in-out ${
                      isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="flex min-h-0 items-start gap-2 self-stretch overflow-hidden">
                      <div className="flex items-center gap-6 self-stretch px-3.5">
                        <div className="w-px self-stretch bg-table-border" />
                      </div>
                      <div className="flex flex-col items-start gap-7 pb-[18px] pt-3">
                        {children.map((child) => {
                          const isChildActive = activeId === child.id;
                          const childHighlightClass = isChildActive
                            ? "text-button-primary"
                            : "text-foreground hover:text-button-primary";
                          return (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => handleNavigate(child.id)}
                              className={`rounded-md px-2 py-1 text-left font-['Manrope'] text-base font-medium leading-6 transition-colors ${childHighlightClass}`}
                              data-testid={`vendor-form-nav-${child.id}`}
                            >
                              {child.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              ) : !isLastSection ? (
                // Leaf section (no children) — still render the connector stub
                // so the line stays continuous down to the next heading,
                // matching sections that do have children. Skipped only for
                // the last section, since there's nothing below it to connect to.
                <div className="flex h-4 items-start gap-2 self-stretch">
                  <div className="flex items-center gap-6 self-stretch px-3.5">
                    <div className="w-px self-stretch bg-table-border" />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default VendorFormSectionNav;
