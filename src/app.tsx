import { useEffect } from "react";

import { Landing } from "./components/landing";
import { Maker } from "./components/maker";
import { usePath } from "./router";

export const App = () => {
  const path = usePath();
  const onMaker = path.replace(/\/+$/u, "") === "/make";

  useEffect(() => {
    document.title = onMaker
      ? "Make a cover · Album Cover Maker by Irma HS"
      : "Album Cover Maker by Irma HS";
  }, [onMaker]);

  return onMaker ? <Maker /> : <Landing />;
};
