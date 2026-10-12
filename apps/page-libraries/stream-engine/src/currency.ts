const DIGITS = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
const POSITIONS = ["", "拾", "佰", "仟"];
const GROUPS = ["", "万", "亿", "兆"];

function fourDigits(value: number): string {
  let text = "";
  let zero = false;
  for (let position = 3; position >= 0; position--) {
    const digit = Math.floor(value / 10 ** position) % 10;
    if (digit === 0) {
      zero = Boolean(text);
    } else {
      if (zero) text += DIGITS[0];
      text += DIGITS[digit] + POSITIONS[position];
      zero = false;
    }
  }
  return text;
}

/** 与旧金额控件一致，支持角、分、毫、厘四位小数。 */
export function toChineseCurrency(value: unknown): string {
  if (value === "" || value == null) return "";
  const amount = Number(value);
  if (!Number.isFinite(amount) || Math.abs(amount) >= 1_000_000_000_000_000) return "";
  if (amount === 0) return "零元整";
  const negative = amount < 0 ? "负" : "";
  const [integerText, fractionText] = Math.abs(amount).toFixed(4).split(".");
  let integer = Number(integerText);
  const chunks: number[] = [];
  while (integer > 0) {
    chunks.unshift(integer % 10000);
    integer = Math.floor(integer / 10000);
  }
  let text = "";
  let pendingZero = false;
  chunks.forEach((chunk, index) => {
    if (chunk === 0) {
      pendingZero = Boolean(text);
      return;
    }
    if (text && (pendingZero || chunk < 1000)) text += DIGITS[0];
    text += fourDigits(chunk) + GROUPS[chunks.length - index - 1];
    pendingZero = false;
  });
  if (Number(integerText) > 0) text += "元";
  const units = ["角", "分", "毫", "厘"];
  const fraction = [...fractionText.replace(/0+$/, "")]
    .map((digit, index) => (digit === "0" ? "" : DIGITS[Number(digit)] + units[index]))
    .join("");
  return negative + (fraction ? text + fraction : text + "整");
}
