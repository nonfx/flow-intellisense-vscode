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
import { FlowElementAttributeMeta, FlowElementMeta } from "./app";
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
    //console.log(tag, ":", attr);
    if (tag && components[tag] && attr) {
      // console.log(components[tag].attributes[attr]);
      const attrMeta = components[tag].attributes[attr];

      const md = new MarkdownString(getAttrMD(tag, attr, attrMeta));
      md.supportHtml = true;
      return {
        contents: [md],
      };
    } else if (tag && components[tag]) {
      const md = new MarkdownString(getTagMD(tag, components[tag]));
      md.supportHtml = true;
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

function getAttrMD(
  tag: string,
  attr: string,
  attrMeta: FlowElementAttributeMeta
) {
  const values = attrMeta.values
    ? `- values : \`\`\`${Object.keys(attrMeta.values).join(" | ")}\`\`\``
    : "";

  return `\`\`\`${attr}\`\`\`\n
${attrMeta.description} 
- type : \`\`\`${attrMeta.type}\`\`\`
- default :\`\`\` ${attrMeta.default}\`\`\`
- isRequired : \`\`\`${attrMeta.isRequired}\`\`\`
${values}
`;
}

function getTagMD(tag: string, tagMeta: FlowElementMeta) {
  let attributes = `---
#### Attributes
`;
  Object.keys(tagMeta.attributes).forEach((attr) => {
    attributes += `
${getAttrMD(tag, attr, tagMeta.attributes[attr])}`;
  });
  return `### ${tagMeta.title}\n${tagMeta.description}
- HTML Tag : \`\`\`${tag}\`\`\`
- Category : \`\`\`${tagMeta.category}\`\`\`
- [Docs](${tagMeta.docLink})
${attributes}
`;
}
