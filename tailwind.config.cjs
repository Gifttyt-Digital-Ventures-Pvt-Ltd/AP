/** @type {import('tailwindcss').Config} */
const withOpacity = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    fontFamily: {},
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: withOpacity("--background-rgb"),
        foreground: withOpacity("--foreground-rgb"),
        card: {
          DEFAULT: withOpacity("--card-rgb"),
          foreground: withOpacity("--card-foreground-rgb"),
        },
        popover: {
          DEFAULT: withOpacity("--popover-rgb"),
          foreground: withOpacity("--popover-foreground-rgb"),
        },
        primary: {
          DEFAULT: withOpacity("--primary-rgb"),
          foreground: withOpacity("--primary-foreground-rgb"),
        },
        secondary: {
          DEFAULT: withOpacity("--secondary-rgb"),
          foreground: withOpacity("--secondary-foreground-rgb"),
        },
        muted: {
          DEFAULT: withOpacity("--muted-rgb"),
          foreground: withOpacity("--muted-foreground-rgb"),
        },
        accent: {
          DEFAULT: withOpacity("--accent-rgb"),
          foreground: withOpacity("--accent-foreground-rgb"),
        },
        destructive: {
          DEFAULT: withOpacity("--destructive-rgb"),
          foreground: withOpacity("--destructive-foreground-rgb"),
        },
        border: withOpacity("--border-rgb"),
        input: withOpacity("--input-rgb"),
        ring: withOpacity("--ring-rgb"),
        chart: {
          1: withOpacity("--chart-1-rgb"),
          2: withOpacity("--chart-2-rgb"),
          3: withOpacity("--chart-3-rgb"),
          4: withOpacity("--chart-4-rgb"),
          5: withOpacity("--chart-5-rgb"),
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
