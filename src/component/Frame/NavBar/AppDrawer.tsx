import {
  alpha,
  Box,
  createTheme,
  Drawer,
  Popover,
  PopoverProps,
  Stack,
  ThemeProvider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useContext, useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks.ts";
import SessionManager from "../../../session";
import { sf, sfGradients } from "../../../theme/storflow.ts";
import TreeNavigation from "../../FileManager/TreeView/TreeNavigation.tsx";
import { PageVariant, PageVariantContext } from "../NavBarFrame.tsx";
import DrawerHeader from "./DrawerHeader.tsx";
import PageNavigation, { AdminPageNavigation } from "./PageNavigation.tsx";
import StorageSummary from "./StorageSummary.tsx";

/**
 * 侧边栏在明暗两种主题下都是深色玻璃面板，这里用嵌套主题把文本 / 分隔线 /
 * 交互态换成浅色，树形导航等子组件不需要感知自己渲染在深色底上。
 */
const useSidebarTheme = () => {
  const outer = useTheme();
  return useMemo(
    () =>
      createTheme(outer, {
        palette: {
          mode: "dark",
          primary: { main: sf.brandSoft, light: "#C7D2FE", dark: sf.brandBright, contrastText: "#0A0F1F" },
          background: { default: "transparent", paper: alpha("#FFFFFF", 0.06) },
          text: {
            primary: "#EAF2F7",
            secondary: "rgba(226,238,246,0.68)",
            disabled: "rgba(226,238,246,0.34)",
          },
          divider: "rgba(255,255,255,0.10)",
          action: {
            active: "#FFFFFF",
            hover: "rgba(255,255,255,0.08)",
            selected: "rgba(124,144,255,0.20)",
            focus: "rgba(124,144,255,0.26)",
            disabled: "rgba(226,238,246,0.30)",
            disabledBackground: "rgba(255,255,255,0.06)",
          },
        },
      }),
    [outer],
  );
};

/** 面板上的品牌光晕，避免深色侧边栏是一块死板的纯色。 */
const SidebarGlow = () => (
  <Box
    aria-hidden
    sx={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      background:
        "radial-gradient(120% 55% at 0% 0%, rgba(20,184,166,0.20) 0%, rgba(20,184,166,0) 60%)," +
        "radial-gradient(90% 40% at 100% 100%, rgba(14,116,144,0.24) 0%, rgba(14,116,144,0) 72%)",
    }}
  />
);

const DrawerContent = () => {
  const { sidebar_bottom } = useAppSelector((state) => state.siteConfig.basic?.config?.custom_html ?? {});
  const scrollRef = useRef<any>();
  const user = SessionManager.currentLoginOrNull();
  const theme = useTheme();
  const sidebarTheme = useSidebarTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const pageVariant = useContext(PageVariantContext);
  const isDashboard = pageVariant === PageVariant.dashboard;
  return (
    <ThemeProvider theme={sidebarTheme}>
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <SidebarGlow />
        <DrawerHeader />
        <Stack
          direction={"column"}
          spacing={2}
          ref={scrollRef}
          sx={{
            px: 1.5,
            pt: 1.5,
            pb: 2,
            flexGrow: 1,
            overflow: "auto",
            position: "relative",
            zIndex: 1,
          }}
        >
          {!isDashboard && (
            <>
              <TreeNavigation scrollRef={scrollRef} hideWithDrawer={!isMobile} />
              <PageNavigation />
              {user && <StorageSummary />}
            </>
          )}
          {isDashboard && <AdminPageNavigation />}
          {sidebar_bottom && (
            <Box sx={{ width: "100%" }}>
              <div dangerouslySetInnerHTML={{ __html: sidebar_bottom }} />
            </Box>
          )}
        </Stack>
      </Box>
    </ThemeProvider>
  );
};

export const DrawerPopover = (props: PopoverProps) => {
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.globalState.drawerOpen);
  const drawerWidth = useAppSelector((state) => state.globalState.drawerWidth);
  return (
    <Popover
      {...props}
      slotProps={{
        paper: {
          sx: {
            backgroundImage: sfGradients.sidebar,
            backgroundColor: sf.navy,
            border: "none",
            borderRadius: 3,
            overflow: "hidden",
          },
        },
      }}
    >
      <Box sx={{ width: "70vw" }}>
        <DrawerContent />
      </Box>
    </Popover>
  );
};

const AppDrawer = () => {
  const open = useAppSelector((state) => state.globalState.drawerOpen);
  const drawerWidth = useAppSelector((state) => state.globalState.drawerWidth);

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        display: "flex",
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          borderRight: "none",
          position: "relative",
          overflow: "hidden",
        },
      }}
      variant="persistent"
      anchor="left"
      open={open}
    >
      <DrawerContent />
    </Drawer>
  );
};

export default AppDrawer;
