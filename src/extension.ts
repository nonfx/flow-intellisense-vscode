// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { App, FlowElementMeta, FlowDocsContentProvider } from "./app";

import configs from "./config/elements";
import FlowCompletionItemProvider from "./FlowCompletionProvider";
import FlowHoverProvider from "./FlowHoverProvider";
import validate from "./FlowDocValidator";

const components: ({
  tag: string;
  path: string;
} & FlowElementMeta)[] = [];
Object.keys(configs).forEach((item) => {
  components.push({
    tag: item,
    ...(configs as unknown as Record<string, FlowElementMeta>)[item],
    path: item,
  });
});

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "flow-intellisense-vscode" is now active!'
  );
  let app = new App();
  app.setConfig();
  let docs = new FlowDocsContentProvider();
  let completionItemProvider = new FlowCompletionItemProvider();
  let registration = vscode.workspace.registerTextDocumentContentProvider(
    "flow-helper",
    docs
  );

  const docSelector = [
    {
      language: "vue",
      scheme: "file",
    },
    {
      language: "typescript",
      scheme: "file",
    },
    {
      language: "html",
      scheme: "file",
    },
    {
      language: "mdx",
      scheme: "file",
    },
  ];

  let completion = vscode.languages.registerCompletionItemProvider(
    docSelector,
    completionItemProvider,
    "",
    " ",
    ":",
    "<",
    '"',
    "'",
    "/",
    "@",
    "("
  );
  let vueLanguageConfig = vscode.languages.setLanguageConfiguration("vue", {
    wordPattern: app.WORD_REG,
  });
  const hoverProvider = new FlowHoverProvider();
  let hover = vscode.languages.registerHoverProvider(
    docSelector,
    hoverProvider
  );

  const collection = vscode.languages.createDiagnosticCollection("flow");
  const activeDocument = vscode.window.activeTextEditor?.document;
  if (vscode.window.activeTextEditor && activeDocument) {
    validate(activeDocument, collection);
  }
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand("flow-core.search", () => {
    vscode.window.showInformationMessage("Welcome to flow design system");

    // if (context.workspaceState.get('flow-helper.loading', false)) {
    //     vscode.window.showInformationMessage('Document is initializing, please wait a minute depend on your network.');
    //     return;
    // }

    switch (vscode.window.activeTextEditor?.document.languageId) {
      case "vue":
      case "typescript":
      case "html":
        break;
      default:
        return;
    }

    const selection = app.getSeletedText();
    let items = components.map((item) => {
      return {
        label: item.tag,
        detail: item.category,
        path: item.path,
        description: item.description,
      };
    });

    if (items.length < 1) {
      vscode.window.showInformationMessage(
        "Initializing。。。, please try again."
      );
      return;
    }

    let find = items.filter((item) => item.label === selection);

    if (find.length) {
      app.openDocs(find[0], find[0].label);
      return;
    }

    // cant set default value for this method? angry.
    vscode.window.showQuickPick(items).then((selected) => {
      selected && app.openDocs(selected, selected.label);
    });
  });

  context.subscriptions.push(
    app,
    disposable,
    registration,
    completion,
    vueLanguageConfig,
    hover,
    vscode.workspace.onDidChangeTextDocument((e) => {
      collection.delete(e.document.uri);
      if (e.document) {
        validate(e.document, collection);
      }
    }),
    vscode.window.onDidChangeActiveTextEditor((e) => {
      if (e) {
        collection.delete(e?.document.uri);
        if (e.document) {
          validate(e.document, collection);
        }
      }
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      collection.delete(e.document.uri);
      if (e.document) {
        validate(e.document, collection);
      }
    }),
    vscode.workspace.onDidCloseTextDocument((document) =>
      collection.delete(document.uri)
    )
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
