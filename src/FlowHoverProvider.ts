import {
  CancellationToken,
  Hover,
  HoverProvider,
  MarkdownString,
  Position,
  ProviderResult,
  TextDocument,
  workspace,
} from "vscode";
import FlowBaseProvider from "./FlowBaseProvider";
import componentmeta from "./config/elements";
import { FlowElementMeta } from "./app";
const components = componentmeta as unknown as Record<string, FlowElementMeta>;
export default class FlowHoverProvider
  extends FlowBaseProvider
  implements HoverProvider
{
  constructor() {
    super();
  }
  provideHover(
    document: TextDocument,
    position: Position,
    token: CancellationToken
  ): ProviderResult<Hover> {
    this._document = document;
    this._position = position;

    const config = workspace.getConfiguration("flow-helper");
    this.size = config.get("indent-size");
    const normalQuotes = config.get("quotes") === "double" ? '"' : "'";
    this.quotes = normalQuotes;

    let tag = this.getTagName();
    let attr = this.getAttrName();
    if (tag && components[tag] && attr) {
      const md = new MarkdownString(`\`\`\` ${
        JSON.stringify(components[tag].attributes[attr]) + `\`\`\``
      }
		`);
      return {
        contents: [md],
      };
    } else if (tag && components[tag]) {
      const md = new MarkdownString(`\`\`\` ${
        JSON.stringify(components[tag]) + `\`\`\``
      }
	  `);
      return {
        contents: [md],
      };
    } else {
      return {
        contents: [],
      };
    }
  }
}
