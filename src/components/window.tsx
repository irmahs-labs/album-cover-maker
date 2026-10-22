import type { ComponentProps } from "react";

/**
 * Cute Matcha's Window: a lime body under a grid-textured title bar that
 * names it like a file, with an extension that exists ("cover.png").
 */
export const Window = ({
  name,
  children,
  className = "",
  ...rest
}: ComponentProps<"section"> & { name: string }) => (
  <section
    {...rest}
    className={`window ${className}`}
    // read as its words: "how-it-works.md" is "how it works"
    aria-label={name.replace(/\.\w+$/u, "").replaceAll("-", " ")}
  >
    <div className="window-bar">
      <span className="window-name">{name}</span>
      <span className="window-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </div>
    <div className="window-body">{children}</div>
  </section>
);
