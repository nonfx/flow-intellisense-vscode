import {
  Diagnostic,
  DiagnosticCollection,
  DiagnosticRelatedInformation,
  DiagnosticSeverity,
  Location,
  Position,
  Range,
  TextDocument,
} from "vscode";
import { FlowElementMeta } from "./app";

import componentmeta from "./config/elements";
const components = componentmeta as unknown as Record<string, FlowElementMeta>;

export default function validate(
  document: TextDocument,
  collection: DiagnosticCollection
) {
  let flowTagRegex = /<(?=f-.*)(.|\n)*?>/g;
  const documentText = document.getText();
  let flowTags = documentText.match(flowTagRegex);
  const docIssues: Diagnostic[] = [];
  if (flowTags) {
    const tagPositions = getTagPositions(flowTags, document);
    // console.log(tagPositions);
    tagPositions.forEach((tagMeta) => {
      for (const [attributeName, attrMeta] of Object.entries(
        components[tagMeta.name].attributes
      )) {
        const attr = tagMeta.attributes[attributeName];
        if (attr) {
          const [attrName, value] = attr.attribute.split("=");

          if (attrName && attrMeta) {
            if (
              attrMeta.isRequired &&
              (value === `""` || value === `''` || !value)
            ) {
              docIssues.push({
                code: "",
                message: `${attrName} cannot be blank`,
                range: attr.range,
                severity: DiagnosticSeverity.Error,
                source: "",
                relatedInformation: [
                  new DiagnosticRelatedInformation(
                    new Location(document.uri, attr.range),
                    "Blank value not allowed"
                  ),
                ],
              });
            }
          }
        } else if (attrMeta.isRequired) {
          docIssues.push({
            code: "",
            message: `${attributeName} is required`,
            range: tagMeta.range,
            severity: DiagnosticSeverity.Error,
            source: "",
            relatedInformation: [
              new DiagnosticRelatedInformation(
                new Location(document.uri, tagMeta.range),
                "Mandatory fields are required"
              ),
            ],
          });
        }
      }
    });
  }

  collection.set(document.uri, docIssues);
}

type ElementRange = {
  name: string;
  tag: string;
  range: Range;
  attributes: Record<string, AttributeRange>;
};

type AttributeRange = {
  attribute: string;
  range: Range;
};

function getTagPositions(
  tags: RegExpMatchArray,
  document: TextDocument
): ElementRange[] {
  let lastTagEndIndex = 0;
  const elementRangeArray: ElementRange[] = [];
  // console.log(tags);
  tags?.forEach((tag) => {
    // console.log(lastTagEndIndex);
    const documentText = document.getText();
    const startIndex = documentText.indexOf(tag, lastTagEndIndex);
    const startPosition = getTagPositionByIndex(startIndex, documentText);

    const endIndex = startIndex + tag.length - 1;

    const endPosition = getTagPositionByIndex(endIndex, documentText);

    const tagRange = new Range(startPosition, endPosition);

    const tagmatches = /<([\w-]+)(\s?)+/g.exec(tag);
    const tagName = tagmatches ? tagmatches[1] : null;

    if (tagName && components[tagName]) {
      const elementRange: ElementRange = {
        name: tagName,
        tag,
        range: tagRange,
        attributes: {},
      };

      //   console.log(
      //     tag,
      //     tagRange.start.line,
      //     tagRange.start.character,
      //     tagRange.end.line,
      //     tagRange.end.character
      //   );
      let attrRegex =
        /(\S+)=["'{]((?:.(?!["']?\s+(?:\S+)=|\s*\/?[>"']))+.)?(\s*?)["'}]/gm;
      let attrs = tag.match(attrRegex);
      let lastAttrEndIndex = 0;
      attrs?.forEach((attr) => {
        const attrStartIndex = tag.indexOf(attr, lastAttrEndIndex);
        const attrStartPosition = getPositionByIndex(
          attrStartIndex,
          tag,
          startPosition.line
        );

        lastAttrEndIndex = attrStartIndex + attr.length - 1;

        const attrEndPosition = getPositionByIndex(
          lastAttrEndIndex,
          tag,
          startPosition.line
        );
        const attrRange = new Range(attrStartPosition, attrEndPosition);

        elementRange.attributes[attr.split("=")[0]] = {
          range: attrRange,
          attribute: attr,
        };

        // console.log(
        //   attr,
        //   attrRange.start.line,
        //   attrRange.start.character,
        //   attrRange.end.line,
        //   attrRange.end.character
        // );
      });
      elementRangeArray.push(elementRange);
    }

    lastTagEndIndex = endIndex;
  });

  return elementRangeArray;
}

function getPositionByIndex(
  index: number,
  text: string,
  parentLineNumber?: number
): Position {
  let lines = text.substring(0, index).split("\n");
  const lineNumber = lines.length - 1;
  lines.splice(lineNumber, 1);
  const positionStart = index - lines.join("").length;
  return new Position(
    lineNumber + (parentLineNumber === undefined ? 0 : parentLineNumber),
    positionStart
  );
}

function getTagPositionByIndex(
  index: number,
  text: string,
  parentLineNumber?: number
): Position {
  let lines = text.substring(0, index).split("\n");
  const lineNumber = lines.length - 1;
  lines.splice(lineNumber, 1);
  const positionStart = index - lines.join("").length - lines.length;
  return new Position(
    lineNumber + (parentLineNumber === undefined ? 0 : parentLineNumber),
    positionStart
  );
}
