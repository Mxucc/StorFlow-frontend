import { Box, Grid, Stack, Typography, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "../../../redux/hooks.ts";
import { sfGradients, sfShadow } from "../../../theme/storflow.ts";
import AppLinks from "./AppLinks.tsx";

const Step = ({ index, children }: { index: number; children: React.ReactNode }) => (
  <Stack direction={"row"} spacing={2} alignItems={"flex-start"}>
    <Box
      sx={{
        width: 26,
        height: 26,
        borderRadius: "9px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 700,
        color: "#FFFFFF",
        backgroundImage: sfGradients.accent,
      }}
    >
      {index}
    </Box>
    <Typography variant={"body2"} color={"text.secondary"} sx={{ pt: 0.5 }}>
      {children}
    </Typography>
  </Stack>
);

/** 抽象的桌面窗口示意图（纯 CSS）。 */
const WindowMockup = () => {
  const theme = useTheme();
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: { xs: 300, md: 420 } }}>
      <Box
        sx={{
          width: "100%",
          maxWidth: 460,
          borderRadius: "14px",
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
          boxShadow: sfShadow.float,
        }}
      >
        <Box
          sx={{
            height: 34,
            px: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            borderBottom: "1px solid",
            borderColor: "divider",
            backgroundColor: theme.palette.action.hover,
          }}
        >
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <Box key={c} sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: c, opacity: 0.85 }} />
          ))}
        </Box>
        <Box sx={{ display: "flex", minHeight: 240 }}>
          <Box
            sx={{
              width: 132,
              flexShrink: 0,
              p: 1.5,
              borderRight: "1px solid",
              borderColor: "divider",
              backgroundImage: sfGradients.sidebar,
            }}
          >
            <Box sx={{ height: 10, width: "72%", borderRadius: 4, backgroundColor: "rgba(255,255,255,0.5)" }} />
            {[0, 1, 2, 3].map((i) => (
              <Box
                key={i}
                sx={{
                  height: 8,
                  width: `${52 + ((i * 11) % 34)}%`,
                  mt: 1.6,
                  borderRadius: 4,
                  backgroundColor: i === 1 ? "rgba(124,144,255,0.85)" : "rgba(255,255,255,0.22)",
                }}
              />
            ))}
          </Box>
          <Box sx={{ flexGrow: 1, p: 2, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Box key={i} sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                <Box
                  sx={{
                    height: 46,
                    borderRadius: "10px",
                    backgroundImage: sfGradients.tint,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                />
                <Box
                  sx={{ height: 7, width: `${54 + ((i * 9) % 32)}%`, borderRadius: 4, backgroundColor: "action.hover" }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

/**
 * 桌面端接入引导：不再宣传第三方客户端，改为「浏览器安装为桌面应用 + WebDAV 挂载」两条路径。
 */
const DesktopAppPromotion = () => {
  const title = useAppSelector((state) => state.siteConfig.basic.config.title);
  const { t } = useTranslation();

  return (
    <Grid
      container
      spacing={{ xs: 2, md: 6 }}
      sx={{
        px: 2,
        pt: 4,
        pb: 4,
      }}
    >
      <Grid item xs={12} md={6}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: 2,
          }}
          color="text.primary"
        >
          {t("setting.desktopAppTitleLead")}
          <Typography color={"primary"} component={"span"} variant={"inherit"}>
            {title}
          </Typography>
          {t("setting.desktopAppTitleTrail")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, maxWidth: 520 }}>
          {t("setting.desktopAppDescription")}
        </Typography>
        <Stack spacing={2.5} sx={{ maxWidth: 520 }}>
          <Step index={1}>{t("setting.desktopStep1")}</Step>
          <Step index={2}>{t("setting.desktopStep2")}</Step>
          <Step index={3}>{t("setting.desktopStep3")}</Step>
        </Stack>
        <AppLinks />
      </Grid>
      <Grid item xs={12} md={6}>
        <WindowMockup />
      </Grid>
    </Grid>
  );
};

export default DesktopAppPromotion;
