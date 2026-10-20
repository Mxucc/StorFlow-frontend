import i18n from "../../../../i18n.ts";

/**
 * 自定义属性的「名称」既可以是纯文本，也可以是 i18next 键值（后台添加属性时即如此提示）。
 *
 * 内置属性键（`customProps.*`）位于 `dashboard` 命名空间，而文件侧边栏默认命名空间是
 * `application`，直接 `t(name)` 会显示裸 key。这里显式做一次 dashboard 兜底。
 */
export const translatePropName = (name?: string): string => {
  if (!name) return "";
  if (i18n.exists(name)) return i18n.t(name);
  if (i18n.exists(`dashboard:${name}`)) return i18n.t(`dashboard:${name}`);
  return name;
};

export default translatePropName;
