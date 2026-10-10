import { useEffect } from "react";
import { Landing } from "./components/Landing";
import { Maker } from "./components/Maker";
import { usePath } from "./router";

export function App() {
  const path = usePath();
  const onMaker = path.replace(/\/+$/, "") === "/make";

  useEffect(() => {
    document.title = onMaker ? "Make a cover · Album Cover Maker by Irma HS" : "Album Cover Maker by Irma HS";
  }, [onMaker]);

  return onMaker ? <Maker /> : <Landing />;
}
