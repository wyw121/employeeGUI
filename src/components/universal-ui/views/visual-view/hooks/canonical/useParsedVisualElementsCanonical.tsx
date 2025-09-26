// Canonical parser hook for visual-view kept in a dedicated file to avoid accidental duplication
import { useState, useEffect, useCallback } from "react";
import type { VisualUIElement, VisualElementCategory } from "../../../../types";
import { parseBounds } from "../../utils/elementTransform";
import { categorizeElement, getUserFriendlyName } from "../../utils/categorization";

export interface UseParsedVisualElementsResult {
  parsedElements: VisualUIElement[];
  categories: VisualElementCategory[];
  parseXML: (xml: string) => void;
}

export function useParsedVisualElements(
  xmlContent: string | undefined,
  _fallbackElements: VisualUIElement[]
): UseParsedVisualElementsResult {
  const [parsedElements, setParsedElements] = useState<VisualUIElement[]>([]);
  const [categories, setCategories] = useState<VisualElementCategory[]>([]);

  const parseXML = useCallback((xmlString: string) => {
    if (!xmlString) return;
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      const nodes = xmlDoc.querySelectorAll("node");

      const extracted: VisualUIElement[] = [];
      const catMap: Record<string, VisualElementCategory & { elements: VisualUIElement[] }>
        = Object.create(null);

      const ensureCat = (
        key: string,
        base: Omit<VisualElementCategory, "elements">
      ) => {
        if (!catMap[key]) catMap[key] = { ...base, elements: [] } as any;
        return catMap[key];
      };

      nodes.forEach((node, index) => {
        const bounds = node.getAttribute("bounds") || "";
        const text = node.getAttribute("text") || "";
        const contentDesc = node.getAttribute("content-desc") || "";
        const className = node.getAttribute("class") || "";
        const clickable = node.getAttribute("clickable") === "true";

        if (!bounds || bounds === "[0,0][0,0]") return;
        if (!text && !contentDesc && !clickable) return;

        const position = parseBounds(bounds);
        if (position.width <= 0 || position.height <= 0) return;

        const categoryKey = (categorizeElement({
          "content-desc": contentDesc,
          text,
          class: className,
          clickable: clickable ? "true" : "false",
        } as any) as unknown) as string;

        const userFriendlyName = getUserFriendlyName({
          "content-desc": contentDesc,
          text,
          class: className,
          clickable: clickable ? "true" : "false",
        } as any);

        const element: VisualUIElement = {
          id: `element-${index}`,
          text,
          description:
            contentDesc || `${userFriendlyName}${clickable ? "（可点击）" : ""}`,
          type: className.split(".").pop() || "Unknown",
          category: (categoryKey || "others") as any,
          position,
          clickable,
          importance: "low" as any,
          userFriendlyName,
        };
        extracted.push(element);

        const cat = ensureCat(categoryKey || "others", {
          name: "其他元素",
          icon: undefined as any,
          color: "#8c8c8c",
          description: "其他UI元素",
        });
        (cat.elements as VisualUIElement[]).push(element);
      });

      setParsedElements(extracted);
      setCategories(
        Object.values(catMap).filter((c) => (c as any).elements.length > 0) as any
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("XML解析失败:", err);
    }
  }, []);

  useEffect(() => {
    if (xmlContent) parseXML(xmlContent);
  }, [xmlContent, parseXML]);

  return { parsedElements, categories, parseXML };
}
