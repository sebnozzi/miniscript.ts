/* eslint-disable no-var */
/// <reference types="ace" />

export {};

declare module globalThis {
  let editor: AceAjax.Editor;
}

declare global {
  var editor: AceAjax.Editor;
}

declare var editor: AceAjax.Editor;