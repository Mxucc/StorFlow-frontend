import { VASProductType } from "../../../../api/dashboard";

/** 商品类型下拉选项顺序：容量包 / 会员 / 积分包。 */
export const productTypes: VASProductType[] = ["storage", "group", "points"];

/** 容量单位（字节倍数），用于「数值 + 单位」形式的容量输入。 */
export const sizeUnits = [1, 1024, 1024 ** 2, 1024 ** 3, 1024 ** 4];

/** 将字节数还原为「数值 + 单位」以便编辑，尽量使用最大可整除单位。 */
export const bytesToInput = (bytes: number): { value: string; unit: number } => {
  for (let i = sizeUnits.length - 1; i >= 0; i--) {
    if (bytes > 0 && bytes % sizeUnits[i] === 0) {
      return { value: String(bytes / sizeUnits[i]), unit: sizeUnits[i] };
    }
  }
  return { value: String(bytes > 0 ? bytes : 0), unit: 1 };
};

export const typeColor = (type: VASProductType): "primary" | "secondary" | "info" => {
  switch (type) {
    case "storage":
      return "primary";
    case "group":
      return "secondary";
    default:
      return "info";
  }
};

export const typeLabel = (type: string, t: (key: string) => string) => {
  switch (type) {
    case "storage":
      return t("vas.typeStorage");
    case "group":
      return t("vas.typeGroup");
    case "points":
      return t("vas.typePoints");
    default:
      return type;
  }
};
