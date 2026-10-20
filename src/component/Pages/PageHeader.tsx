import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import ArrowClockwiseFilled from "../Icons/ArrowClockwiseFilled.tsx";
import { useTranslation } from "react-i18next";
import PageTitle from "../../router/PageTitle.tsx";
import { sfGradients } from "../../theme/storflow.ts";

export const PageTabQuery = "tab";

export interface PageHeaderProps {
  title: string;
  loading?: boolean;
  onRefresh?: () => void;
  skipChangingDocumentTitle?: boolean;
  secondaryAction?: React.ReactNode;
}

/**
 * 页面标题栏：品牌强调条 + 标题 + 刷新 + 右侧操作。
 *
 * 所有管理端页面共用这一个组件，改这里等于统一改掉整套后台的页头观感。
 */
const PageHeader = ({ title, secondaryAction, onRefresh, loading, skipChangingDocumentTitle }: PageHeaderProps) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ mb: 3.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          aria-hidden
          sx={{
            width: 4,
            height: 24,
            borderRadius: 999,
            backgroundImage: sfGradients.accent,
            flexShrink: 0,
          }}
        />
        <Typography variant={"h4"} fontWeight={700} sx={{ letterSpacing: "-0.02em" }}>
          {title}
        </Typography>
        {!skipChangingDocumentTitle && <PageTitle title={title} />}
        {onRefresh && (
          <Tooltip title={t("application:fileManager.refresh")}>
            <IconButton onClick={onRefresh} disabled={loading} sx={{ ml: 0.5 }}>
              <ArrowClockwiseFilled />
            </IconButton>
          </Tooltip>
        )}
        <Box sx={{ flexGrow: 1 }} />
        {secondaryAction && secondaryAction}
      </Box>
    </Box>
  );
};

export default PageHeader;
