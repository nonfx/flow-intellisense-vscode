import { TextDocument, Position, Range } from "vscode";

export type TagObject = {
  text: string;
  offset: number;
};
export default class FlowBaseProvider {
  protected _document!: TextDocument;
  protected _position!: Position;

  protected tagReg: RegExp = /<([\w-]+)\s+/g;
  protected attrReg: RegExp = /(?:\(|\s*)(\w+)=['"][^'"]*/;
  protected tagStartReg: RegExp = /<([\w-]*)$/;
  protected pugTagStartReg: RegExp = /^\s*[\w-]*$/;
  protected size!: number | undefined;
  protected quotes!: string;
  constructor() {}
  getPreTag(): TagObject | undefined {
    let line = this._position.line;
    let tag: TagObject | string | undefined;
    let txt = this.getTextBeforePosition(this._position);

    while (this._position.line - line < 10 && line >= 0) {
      if (line !== this._position.line) {
        txt = this._document.lineAt(line).text;
      }
      tag = this.matchTag(this.tagReg, txt, line);

      if (tag === "break") return;
      if (tag) return <TagObject>tag;
      line--;
    }
    return;
  }

  getTextBeforePosition(position: Position): string {
    var start = new Position(position.line, 0);
    var range = new Range(start, position);
    return this._document.getText(range);
  }
  getLineText(line: number): string {
    return this._document.lineAt(line).text;
  }
  getAllTextBeforePosition(position: Position): string {
    var start = new Position(0, 0);
    var range = new Range(start, position);
    return this._document.getText(range);
  }

  getAllTextAfterPosition(position: Position): string {
    var end = new Position(this._document.lineCount - 1, this._document.eol);
    var range = new Range(position, end);
    return this._document.getText(range);
  }
  matchTag(
    reg: RegExp,
    txt: string,
    line: number
  ): TagObject | string | undefined {
    let match: RegExpExecArray | null;
    let arr: TagObject[] = [];

    if (
      /<\/?[-\w]+[^<>]*>[\s\w]*<?\s*[\w-]*$/.test(txt) ||
      (this._position.line === line &&
        (/^\s*[^<]+\s*>[^<\/>]*$/.test(txt) ||
          /[^<>]*<$/.test(txt[txt.length - 1])))
    ) {
      return "break";
    }
    while ((match = reg.exec(txt))) {
      arr.push({
        text: match[1],
        offset: this._document.offsetAt(new Position(line, match.index)),
      });
    }
    return arr.pop();
  }

  getPreAttr(): string {
    let txt = this.getTextBeforePosition(this._position).replace(
      /"[^'"]*(\s*)[^'"]*$/,
      ""
    );
    let end = this._position.character;
    let start = txt.lastIndexOf(" ", end) + 1;
    let parsedTxt = this._document.getText(
      new Range(this._position.line, start, this._position.line, end)
    );

    return this.matchAttr(this.attrReg, parsedTxt);
  }

  matchAttr(reg: RegExp, txt: string): string {
    let match: RegExpExecArray | null;
    match = reg.exec(txt);
    return (!/"[^"]*"/.test(txt) && match && match[1]) || "";
  }
  getTagName(): string {
    const txt = this.getAllTextBeforePosition(this._position);

    const tagStartIndex = txt.lastIndexOf("<");
    const aftertxt = this.getAllTextAfterPosition(this._position);

    const tagEndIndex = aftertxt.indexOf(">");

    const tagText =
      txt.substring(tagStartIndex) + aftertxt.substring(0, tagEndIndex + 1);

    if (
      tagText.indexOf(" ") > -1 ||
      tagText.indexOf("\n") > -1 ||
      tagText.indexOf("\t") > -1
    ) {
      const whiteSpaceIndices: number[] = [];
      [" ", "\t", "\n"].forEach((w) => {
        const idx = tagText.indexOf(w);
        if (idx > -1) {
          whiteSpaceIndices.push(idx);
        }
      });
      const endIndex = Math.min(...whiteSpaceIndices);

      return tagText.substring(tagText.indexOf("<") + 1, endIndex).trim();
    } else {
      // for this format <span></span>
      return tagText
        .substring(tagText.indexOf("</") + 2, tagText.indexOf(">"))
        .trim();
    }
  }

  getAttrName(): string | null {
    const txt = this.getTextBeforePosition(this._position);

    const whiteSpaceIndices: number[] = [];
    [" ", "\t", "\n"].forEach((w) => {
      const idx = txt.lastIndexOf(w);
      if (idx > -1) {
        whiteSpaceIndices.push(idx);
      }
    });
    const attrStartIndex = Math.max(...whiteSpaceIndices);

    let attrEndIndex = txt.lastIndexOf("=");
    if (
      attrStartIndex > -1 &&
      attrEndIndex > -1 &&
      attrEndIndex > attrStartIndex
    ) {
      const attrText = txt.substring(attrStartIndex, attrEndIndex);

      return attrText.trim();
    } else {
      const aftertxt = this.getAllTextAfterPosition(this._position);
      attrEndIndex = aftertxt.indexOf("=");
      if (attrStartIndex > -1 && attrEndIndex > -1) {
        const attrText =
          txt.substring(attrStartIndex) + aftertxt.substring(0, attrEndIndex);
        if (attrText.includes("<")) {
          return null;
        }
        return attrText.trim();
      }
    }
    return null;
  }
}
