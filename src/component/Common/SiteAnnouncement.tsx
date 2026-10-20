import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "../../redux/hooks.ts";

/**
 * 站点公告弹窗：站点设置里填写了「站点公告」时，用户登录后展示一次。
 * 关闭状态按公告内容哈希记录在 localStorage，公告文案修改后会再次展示。
 */
const SiteAnnouncement = () => {
  const { t } = useTranslation();
  const announcement = useAppSelector((state) => state.siteConfig.basic.config.announcement);
  const [closed, setClosed] = useState(false);

  const storageKey = useMemo(() => {
    if (!announcement) {
      return "";
    }
    let hash = 0;
    for (let i = 0; i < announcement.length; i++) {
      hash = (hash * 31 + announcement.charCodeAt(i)) | 0;
    }
    return `announcement_dismissed_${hash}`;
  }, [announcement]);

  const onClose = useCallback(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, "1");
    }
    setClosed(true);
  }, [storageKey]);

  const dismissed = useMemo(() => {
    if (!storageKey) {
      return true;
    }
    return localStorage.getItem(storageKey) === "1";
  }, [storageKey]);

  if (!announcement || closed || dismissed) {
    return null;
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("announcement")}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ whiteSpace: "pre-wrap" }}>{announcement}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          {t("announcementAcknowledge")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SiteAnnouncement;
