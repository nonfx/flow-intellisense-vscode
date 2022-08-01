import { TextDocument, Position, Range } from "vscode";

export type TagObject = {
  text: string;
  offset: number;
};
export default class FlowBaseProvider {
  protected _document!: TextDocument;
  protected _position!: Position;
  protected _triggerCharacter!: string | undefined;
  protected tagReg: RegExp = /<([\w-]+)\s+/g;
  protected attrReg: RegExp = /(?:\(|\s*)(\w+)=['"][^'"]*/;
  protected tagStartReg: RegExp = /<([\w-]*)$/;
  protected pugTagStartReg: RegExp = /^\s*[\w-]*$/;

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
}
