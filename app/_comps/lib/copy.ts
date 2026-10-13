import { useEffect, useRef, useState } from "react";

function useCopy(ms = 1600) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function copy(text: string) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), ms);
      },
      () => {},
    );
  }

  return { copied, copy };
}

export { useCopy };
