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
    // console.log(tag, ":", attr);
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
  let values = "";
  if (attrMeta.multiValues && attrMeta.values) {
    const valueTypes = Object.keys(attrMeta.values);
    values += `* **Syntax** : `;
    valueTypes.forEach((vt) => {
      values += `[${vt}] `;
    });
    values += `\n
---`;
    valueTypes.forEach((vt) => {
      const valueTypeMeta = (attrMeta.values[vt] as FlowElementAttributeMeta)
        .values;
      values += `\n#### [${vt}] \n`;
      values += Object.entries(valueTypeMeta)
        .map(([val, valMeta]) => {
          return `* **${val}** ${
            (valMeta as FlowElementAttributeMeta).description
              ? `: ${(valMeta as FlowElementAttributeMeta).description} ${
                  attrMeta.default === val ? "(default)" : ""
                }`
              : ""
          }`;
        })
        .join("\n");
      values += "\n";
    });
  } else if (attrMeta.values) {
    values = Object.entries(attrMeta.values)
      .map(([val, valMeta]) => {
        return `* **${val}** ${
          valMeta.description
            ? `: ${valMeta.description} ${
                attrMeta.default === val ? "(default)" : ""
              }`
            : ""
        }`;
      })
      .join("\n");
  }

  //console.log("in attr md", tag, attr);
  return `#### ${attr} (${attrMeta.type}) ${
    attrMeta.isRequired ? `(required)` : ""
  } \n
${attrMeta.description} \n
${values} \n
---
\n
`;
}

function getTagMD(tag: string, tagMeta: FlowElementMeta) {
  let attributes = ``;
  const attributeList = Object.keys(tagMeta.attributes);

  for (let index = 0; index < attributeList.length; index++) {
    const attr = attributeList[index];
    const attrMD = getAttrMD(tag, attr, tagMeta.attributes[attr]);

    attributes += `${attrMD}`;
  }

  // console.log(attributes);
  return `### ${tag} \n ${tagMeta.description}\n
[Documentation](${tagMeta.docLink})\n
--- \n\n
${attributes}
`;
}
