import { useEffect } from "react";

import { Landing } from "./components/landing";
import { Maker } from "./components/maker";
import { useLanguage } from "./lib/language";
import { usePath, withoutTrailingSlashes } from "./router";

export const App = () => {
  const path = usePath();
  const onMaker = withoutTrailingSlashes(path) === "/make";
  const french = useLanguage() === "fr";

  useEffect(() => {
    const app = `Album Cover Maker ${french ? "par" : "by"} Irma HS`;
    const make = french ? "Créer une pochette" : "Make a cover";
    document.title = onMaker ? `${make} · ${app}` : app;
  }, [onMaker, french]);

  return onMaker ? <Maker /> : <Landing />;
};
