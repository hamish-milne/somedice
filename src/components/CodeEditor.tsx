import { enableTabToIndent } from "indent-textarea";
import { useCallback } from "preact/hooks";
import { formText, patch, setAtom, useStore } from "tinystate";

export function CodeEditor() {
  const store = useStore();
  const { ref, ...formTextProps } = formText(store, "inputCode");
  const textareaRefCallback = useCallback((el: HTMLTextAreaElement | null) => {
    ref(el);
    if (el) {
      enableTabToIndent(el);
      patch(store, { codeEditor: setAtom(el) });
    }
  }, []);

  return (
    <textarea
      spellcheck={false}
      autocorrect="off"
      autocapitalize="none"
      autocomplete="off"
      placeholder={"Enter your dice code here..."}
      className="flex-1 p-2 sm:p-4 font-mono text-sm resize-none border border-gray-300 focus:outline-blue-500"
      {...formTextProps}
      ref={textareaRefCallback}
    />
  );
}
