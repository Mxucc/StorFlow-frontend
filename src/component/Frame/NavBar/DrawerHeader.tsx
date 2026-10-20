import { ChevronLeft } from "@mui/icons-material";
import { Box, Fade, IconButton, styled, useMediaQuery, useTheme } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setDrawerOpen } from "../../../redux/globalStateSlice.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import Logo from "../../Common/Logo.tsx";

export const DrawerHeaderContainer = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: "flex-end",
}));

/**
 * 侧边栏品牌区：左侧是 StorFlow 标识，鼠标悬停时右侧浮出折叠按钮。
 *
 * 面板是深色的，Logo 会通过嵌套主题自动切到浅色版本（见 AppDrawer）。
 */
const DrawerHeader = ({ disabled }: { disabled?: boolean }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [showCollapse, setShowCollapse] = useState(false);

  return (
    <DrawerHeaderContainer
      onMouseEnter={() => setShowCollapse(disabled ? false : true)}
      onMouseLeave={() => setShowCollapse(false)}
      sx={{
        px: 2,
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        position: "relative",
        zIndex: 1,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minWidth: 0,
          cursor: "pointer",
          borderRadius: 2,
          px: 0.5,
          mx: -0.5,
          transition: "background-color 160ms ease",
          "&:hover": { backgroundColor: "action.hover" },
        }}
        onClick={() => navigate("/home")}
      >
        <Logo
          sx={{
            height: "auto",
            maxWidth: 156,
            maxHeight: 28,
            width: "100%",
            objectPosition: "left",
            objectFit: "contain",
          }}
        />
      </Box>
      {!isMobile && (
        <Box>
          <Fade in={showCollapse}>
            <IconButton size={"small"} onClick={() => dispatch(setDrawerOpen(false))}>
              <ChevronLeft fontSize={"small"} />
            </IconButton>
          </Fade>
        </Box>
      )}
    </DrawerHeaderContainer>
  );
};

export default DrawerHeader;
