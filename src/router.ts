import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);

  return () => window.removeEventListener("popstate", onChange);
};

export const usePath = (): string =>
  useSyncExternalStore(subscribe, () => window.location.pathname);

/** "/places//" → "/places": a page is the same with or without trailing slashes. */
export const withoutTrailingSlashes = (path: string): string => {
  let end = path.length;

  while (path[end - 1] === "/") {
    end -= 1;
  }

  return path.slice(0, end);
};

export const navigate = (to: string) => {
  if (to === window.location.pathname) {
    return;
  }

  window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
};

/** The parts of a link's click event that linkTo reads. */
type LinkClick = Pick<
  React.MouseEvent<HTMLAnchorElement>,
  "altKey" | "button" | "ctrlKey" | "metaKey" | "preventDefault" | "shiftKey"
>;

/** Click handler for in-app links: keeps cmd/ctrl-click opening a new tab. */
export const linkTo = (to: string) => (e: LinkClick) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
    return;
  }

  e.preventDefault();
  navigate(to);
};
