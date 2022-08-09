"use strict";

import {
  window,
  ViewColumn,
  Disposable,
  TextDocumentContentProvider,
  Event,
  Uri,
  CancellationToken,
  workspace,
  EventEmitter,
} from "vscode";

export interface Query {
  path: string;
  label: string;
  detail: string;
  description: string;
}

export type FlowElementMeta = {
  title: string;
  description: string;
  docLink: string;
  category: string;
  subtags?: string[];
  defaults?: string[];
  attributes: Record<string, FlowElementAttributeMeta>;
};

export type FlowElementAttributeMeta = {
  description?: string;
  isRequired: false;
  type: string;
  default: string;
  multiValues?: boolean;
  values: Record<
    string,
    FlowElementAttributeValueMeta | FlowElementAttributeMeta
  >;
};

export type FlowElementAttributeValueMeta = {
  description?: string;
};
export function encodeDocsUri(query?: Query): Uri {
  return Uri.parse(`flow-helper://search?${JSON.stringify(query)}`);
}

export function decodeDocsUri(uri: Uri): Query {
  return <Query>JSON.parse(uri.query);
}

export class App {
  private _disposable!: Disposable;
  public WORD_REG: RegExp =
    /(-?\d*\.\d\w*)|([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/gi;

  getSeletedText() {
    let editor = window.activeTextEditor;

    if (!editor) {
      return;
    }

    let selection = editor.selection;

    if (selection.isEmpty) {
      let text = [];
      let range = editor.document.getWordRangeAtPosition(
        selection.start,
        this.WORD_REG
      );

      return editor.document.getText(range);
    } else {
      return editor.document.getText(selection);
    }
  }

  setConfig() {
    // https://github.com/Microsoft/vscode/issues/24464
    const config = workspace.getConfiguration("editor");
    const quickSuggestions: { strings: boolean } | undefined =
      config.get("quickSuggestions");
    if (quickSuggestions && !quickSuggestions["strings"]) {
      config.update("quickSuggestions", { strings: true }, true);
    }
  }

  openHtml(query: Query, _title: string) {
    const { label, detail } = query;
    const panel = window.createWebviewPanel(label, detail, ViewColumn.One, {
      enableScripts: true, // 启用JS，默认禁用
      retainContextWhenHidden: true, // webview被隐藏时保持状态，避免被重置
    });

    // And set its HTML content
    panel.webview.html = this.getWebviewContent(query);
  }

  openDocs(
    query: Query,
    title = "flow-helper",
    editor = window.activeTextEditor
  ) {
    this.openHtml(query, title);
  }

  dispose() {
    this._disposable.dispose();
  }

  getWebviewContent(query: Query) {
    const config = workspace.getConfiguration("flow-helper");
    const linkUrl = config.get("link-url");
    const path = query.path;
    const iframeSrc = `${linkUrl}/components/${path}`;
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cat Coding</title>
    </head>
    <body>
      <iframe style="position: absolute;border: none;left: 0;top: 0;width: 100%;height: 100%;" src="${iframeSrc}"></iframe>
    </body>
    </html>`;
  }
}

const HTML_CONTENT = (query: Query) => {
  const config = workspace.getConfiguration("flow-helper");
  const linkUrl = config.get("link-url");
  const path = query.path;
  const iframeSrc = `${linkUrl}/components/${path}`;
  return `
    <body style="background-color: white">
    <iframe style="position: absolute;border: none;left: 0;top: 0;width: 100%;height: 100%;" src="${iframeSrc}"></iframe>
    </body>`;
};

export class FlowDocsContentProvider implements TextDocumentContentProvider {
  private _onDidChange = new EventEmitter<Uri>();

  get onDidChange(): Event<Uri> {
    return this._onDidChange.event;
  }

  public update(uri: Uri) {
    this._onDidChange.fire(uri);
  }

  provideTextDocumentContent(
    uri: Uri,
    token: CancellationToken
  ): string | Thenable<string> {
    return HTML_CONTENT(decodeDocsUri(uri));
  }
}
