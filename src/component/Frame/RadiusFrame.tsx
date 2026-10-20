import { Box, styled } from "@mui/material";
import { sfShadow } from "../../theme/storflow.ts";

/**
 * 控制台里的基础面板：圆角卡片 + 极淡投影。
 *
 * 侧边栏里也复用它（StorageSummary），此时 theme 是嵌套的深色主题，
 * background.paper 会变成半透明玻璃色，卡片自然融进深色面板。
 */
export const RadiusFrame = styled(Box)<{
  withBorder?: boolean;
  square?: boolean;
}>(({ theme, withBorder, square }) => ({
  borderRadius: square ? 0 : theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  border: withBorder ? `1px solid ${theme.palette.divider}` : "initial",
  boxShadow: square ? "none" : sfShadow.card,
  backgroundImage: "none",
}));
