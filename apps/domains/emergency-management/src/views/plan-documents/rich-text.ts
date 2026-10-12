export const sanitizeRichText = (html = ""): string => {
  if (typeof DOMParser === "undefined") return html;
  const document = new DOMParser().parseFromString(html, "text/html");
  const allowedTags = new Set([
    "H1",
    "H2",
    "H3",
    "P",
    "BR",
    "DIV",
    "SPAN",
    "UL",
    "OL",
    "LI",
    "TABLE",
    "THEAD",
    "TBODY",
    "TR",
    "TH",
    "TD",
    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "S",
    "DEL",
    "BLOCKQUOTE",
  ]);
  document.body.querySelectorAll("*").forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      return;
    }
    Array.from(element.attributes).forEach((attribute) => {
      element.removeAttribute(attribute.name);
    });
  });
  return document.body.innerHTML;
};
