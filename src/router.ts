import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
};

export const usePath = (): string =>
  useSyncExternalStore(subscribe, () => window.location.pathname);

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
