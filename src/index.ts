/// <reference types="ace" />

export { setupIde } from "./_IDE/ide";
export { MMLikeInterpreter } from "./_IDE/MMLikeAPIs/MMLikeInterpreter";

export function getEditor(): AceAjax.Editor {
  // @ts-ignore
  const editor = globalThis.editor;
  return editor as AceAjax.Editor;
}