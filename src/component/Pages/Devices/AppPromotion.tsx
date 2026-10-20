import { Box, Grid, Stack, Typography } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useAppSelector } from "../../../redux/hooks.ts";
import { sfGradients, sfShadow } from "../../../theme/storflow.ts";
import { SecondaryButton } from "../../Common/StyledComponents.tsx";
import AppLinks from "./AppLinks.tsx";

/** 步骤序号：品牌渐变小方块，替代原来的纯文字列表。 */
const StepBadge = ({ index }: { index: number }) => (
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
);

const Step = ({ index, children }: { index: number; children: React.ReactNode }) => (
  <Stack direction={"row"} spacing={2} alignItems={"flex-start"}>
    <StepBadge index={index} />
    <Typography variant={"body2"} color={"text.secondary"} sx={{ pt: 0.5 }}>
      {children}
    </Typography>
  </Stack>
);

/** 抽象的手机界面示意图（纯 CSS，不用截图，避免出现任何第三方界面元素）。 */
const PhoneMockup = () => (
  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: { xs: 320, md: 420 } }}>
    <Box
      sx={{
        width: 232,
        p: 1.25,
        borderRadius: "34px",
        backgroundColor: "#0B1220",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: sfShadow.float,
      }}
    >
      <Box sx={{ borderRadius: "26px", overflow: "hidden", backgroundColor: "background.paper" }}>
        <Box
          sx={{
            height: 54,
            px: 2,
            display: "flex",
            alignItems: "center",
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: 700,
            backgroundImage: sfGradients.brand,
          }}
        >
          StorFlow
        </Box>
        {[0, 1, 2, 3, 4].map((i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 2,
              py: 1.35,
              borderBottom: "1px solid",
              borderColor: "divider",
              "&:last-of-type": { borderBottom: "none" },
            }}
          >
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: "8px",
                flexShrink: 0,
                backgroundImage: sfGradients.tint,
                border: "1px solid",
                borderColor: "divider",
              }}
            />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Box
                sx={{
                  height: 8,
                  width: `${58 + ((i * 13) % 30)}%`,
                  borderRadius: 4,
                  backgroundColor: "action.hover",
                }}
              />
              <Box sx={{ height: 6, width: "34%", mt: 0.9, borderRadius: 4, backgroundColor: "action.hover" }} />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  </Box>
);

/**
 * 移动端接入引导：不再宣传任何第三方客户端，而是引导用户把本站安装为 PWA。
 * 二维码指向本站首页（不再携带 refresh token），扫码后直接用同一账号登录。
 */
const AppPromotion = () => {
  const title = useAppSelector((state) => state.siteConfig.basic.config.title);
  const { t } = useTranslation();
  const [showQr, setShowQr] = useState(false);

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
      <Grid item xs={12} md={7}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: 3,
          }}
          color="text.primary"
        >
          <Trans
            i18nKey={"setting.connectByiOS"}
            values={{ title }}
            components={[<Typography key={0} color={"primary"} component={"span"} variant={"inherit"} />]}
          />
        </Typography>
        <Stack spacing={2.5} sx={{ maxWidth: 560 }}>
          <Step index={1}>{t("setting.mobileStep1")}</Step>
          <Step index={2}>{t("setting.mobileStep2")}</Step>
          <Step index={3}>{t("setting.mobileStep3")}</Step>
        </Stack>
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t("setting.openOnPhoneHint")}
          </Typography>
          <Box
            sx={{
              position: "relative",
              display: "inline-block",
              p: 1.5,
              borderRadius: 3,
              backgroundColor: "#FFFFFF",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: sfShadow.card,
            }}
          >
            <QRCodeSVG
              marginSize={1}
              size={176}
              value={window.location.origin}
              onClick={() => setShowQr(false)}
              style={{
                display: "block",
                transition: "filter .3s ease-in",
                filter: showQr ? "initial" : "blur(8px)",
              }}
            />
            {!showQr && (
              <SecondaryButton
                onClick={() => setShowQr(true)}
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
                color={"inherit"}
                variant={"outlined"}
              >
                {t("setting.shoeQr")}
              </SecondaryButton>
            )}
          </Box>
        </Box>
        <AppLinks />
      </Grid>
      <Grid item xs={12} md={5}>
        <PhoneMockup />
      </Grid>
    </Grid>
  );
};

export default AppPromotion;
