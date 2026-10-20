import { useEffect, useRef, useState } from "react";

import { fontStyle } from "../lib/fonts";
import type { TextStyle } from "../lib/fonts";

interface Props<F extends string> {
  id: string;
  label: string;
  fonts: readonly F[];
  value: F;
  /** The chosen treatment, shown on the button. The list shows each family plain. */
  style: TextStyle;
  onChange: (font: F) => void;
}

/**
 * A font menu whose every option is written in its own font. A native
 * <select> can't do this on macOS or iOS, where the system draws the list
 * and ignores each option's font.
 */
export const FontPicker = <F extends string>({
  id,
  label,
  fonts,
  value,
  style,
  onChange,
}: Props<F>) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const typed = useRef({ at: 0, text: "" });
  const optionId = (i: number) => `${id}-option-${i}`;

  const show = (index?: number) => {
    setActive(Math.max(0, index ?? fonts.indexOf(value)));
    setOpen(true);
  };
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) {
      button.current?.focus();
    }
  };
  const choose = (i: number) => {
    onChange(fonts[i]);
    close(true);
  };

  // Focus the list when it opens, and keep the active option in view.
  useEffect(() => {
    if (open) {
      list.current?.focus();
    }
  }, [open]);
  useEffect(() => {
    if (open) {
      list.current?.children[active]?.scrollIntoView?.({ block: "nearest" });
    }
  });

  // A click anywhere else closes the list.
  useEffect(() => {
    if (!open) {
      return;
    }
    const away = (e: PointerEvent) => {
      // SAFETY: a pointerdown on the document always targets a DOM node.
      if (!root.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  /** Typing a name jumps to the first font that starts with it. */
  const typeAhead = (key: string) => {
    // oxlint-disable-next-line react/purity -- this runs in the list's key handler, never during render
    const now = Date.now();
    const t = typed.current;
    t.text = now - t.at < 700 ? t.text + key.toLowerCase() : key.toLowerCase();
    t.at = now;
    const start = t.text.length > 1 ? active : active + 1;
    const order = [...fonts.slice(start), ...fonts.slice(0, start)];
    const hit = order.find((f) => f.toLowerCase().startsWith(t.text));
    if (hit) {
      setActive(fonts.indexOf(hit));
    }
  };

  const onListKey = (e: React.KeyboardEvent) => {
    const last = fonts.length - 1;
    const moves = new Map([
      ["ArrowDown", Math.min(last, active + 1)],
      ["ArrowUp", Math.max(0, active - 1)],
      ["End", last],
      ["Home", 0],
      ["PageDown", Math.min(last, active + 8)],
      ["PageUp", Math.max(0, active - 8)],
    ]);
    const move = moves.get(e.key);
    if (move !== undefined) {
      e.preventDefault();
      setActive(move);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") {
      close(false);
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      typeAhead(e.key);
    }
  };

  const onButtonKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      show();
    }
  };

  return (
    <div className="font-picker" ref={root}>
      <button
        ref={button}
        id={id}
        type="button"
        className="select font-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        style={fontStyle(value, style)}
        onClick={() => (open ? close(true) : show())}
        onKeyDown={onButtonKey}
      >
        {value}
      </button>
      {open && (
        // The listbox pattern from WAI-ARIA: a native <select> can't show
        // each option in its own font on macOS or iOS.
        <div
          ref={list}
          id={`${id}-list`}
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a native <select> can't show each option in its own font on macOS or iOS
          role="listbox"
          aria-label={label}
          aria-activedescendant={optionId(active)}
          tabIndex={-1}
          className="font-list"
          onKeyDown={onListKey}
          onBlur={(e) => {
            // SAFETY: relatedTarget is the element taking focus, or null.
            if (!root.current?.contains(e.relatedTarget as Node | null)) {
              setOpen(false);
            }
          }}
        >
          {fonts.map((font, i) => (
            // Keyboard use goes through the listbox's onKeyDown.
            // oxlint-disable-next-line click-events-have-key-events, jsx-a11y/interactive-supports-focus -- focus stays on the listbox, which points at the active option with aria-activedescendant
            <div
              key={font}
              id={optionId(i)}
              // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an <option> only works inside a native <select>, which can't show each font
              role="option"
              aria-selected={font === value}
              className={i === active ? "active" : undefined}
              style={fontStyle(font)}
              onPointerMove={() => i !== active && setActive(i)}
              onClick={() => choose(i)}
            >
              {font}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
