import { Box, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "../../../redux/hooks.ts";

/**
 * 客户端引导页底部的「反馈 / 论坛」入口。
 * 链接来自站点设置 app_feedback / app_forum，未配置时整个区块不渲染。
 */
const AppLinks = () => {
  const { t } = useTranslation();
  const feedback = useAppSelector((state) => state.siteConfig.app.config?.app_feedback);
  const forum = useAppSelector((state) => state.siteConfig.app.config?.app_forum);

  if (!feedback && !forum) {
    return null;
  }

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        flexWrap: "wrap",
        mt: 2,
      }}
    >
      {feedback && (
        <Button variant="outlined" href={feedback} target="_blank" rel="noopener noreferrer">
          {t("setting.appFeedback")}
        </Button>
      )}
      {forum && (
        <Button variant="outlined" href={forum} target="_blank" rel="noopener noreferrer">
          {t("setting.appForum")}
        </Button>
      )}
    </Box>
  );
};

export default AppLinks;
