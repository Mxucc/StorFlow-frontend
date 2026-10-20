import { Box, ButtonBase, styled } from "@mui/material";
import * as React from "react";
import { NoWrapTypography } from "../../Common/StyledComponents.tsx";

/**
 * 侧边栏导航项：胶囊形，选中时用品牌色高亮并在左侧留一条竖向强调条。
 *
 * 颜色全部取自 theme.palette，因此同一组件在深色侧边栏（嵌套深色主题）和
 * 管理端主题预览（浅色）里都成立。
 */
const StyledButtonBase = styled(ButtonBase)<{
  active?: boolean;
}>(({ theme, active }) => ({
  position: "relative",
  borderRadius: 12,
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  width: "100%",
  color: active ? theme.palette.primary.main : theme.palette.text.secondary,
  backgroundColor: active ? theme.palette.action.selected : "transparent",
  transition: "background-color 160ms ease, color 160ms ease, box-shadow 160ms ease",
  "&:hover": {
    backgroundColor: active ? theme.palette.action.selected : theme.palette.action.hover,
    color: active ? theme.palette.primary.main : theme.palette.text.primary,
  },
  "&::before": {
    content: '""',
    position: "absolute",
    left: 0,
    top: "50%",
    width: 3,
    height: active ? 18 : 0,
    borderRadius: 3,
    transform: "translateY(-50%)",
    backgroundColor: theme.palette.primary.main,
    transition: "height 180ms ease",
  },
}));

export interface SideNavItemBaseProps {
  active?: boolean;
  [key: string]: any;
}
export const SideNavItemBase = React.forwardRef(
  ({ active, ...rest }: SideNavItemBaseProps, ref: React.Ref<HTMLButtonElement>) => {
    return <StyledButtonBase active={active} {...rest} ref={ref} />;
  },
);

const StyledSideNavItem = styled(SideNavItemBase)<{ level?: number }>(({ theme, level }) => ({
  padding: "6px 10px",
  paddingLeft: `${14 + (level ?? 0) * 14}px`,
  minHeight: "34px",
  display: "flex",
  alignItems: "center",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export interface SideNavItemProps extends SideNavItemBaseProps {
  icon?: React.ReactNode;
  label?: string | React.ReactNode;
  level?: number;
  [key: string]: any;
}

const SideNavItem = React.forwardRef(
  ({ icon, label, level, sx, ...rest }: SideNavItemProps, ref: React.Ref<HTMLButtonElement>) => {
    return (
      <StyledSideNavItem
        level={level}
        sx={{
          ...sx,
        }}
        {...rest}
        ref={ref}
      >
        <Box
          sx={{
            width: 20,
            mr: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.95,
          }}
        >
          {icon}
        </Box>
        <NoWrapTypography variant={"body2"} fontWeight={500}>
          {label}
        </NoWrapTypography>
      </StyledSideNavItem>
    );
  },
);

export default SideNavItem;
