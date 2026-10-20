import { FormControl, FormControlLabel, Switch, Typography } from "@mui/material";
import { useCallback, useContext, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { GroupEnt } from "../../../../api/dashboard";
import { GroupPermission } from "../../../../api/user";
import Boolset from "../../../../util/boolset";
import SettingForm from "../../../Pages/Setting/SettingForm";
import { NoMarginHelperText, SettingSection, SettingSectionContent } from "../../Settings/Settings";
import { AnonymousGroupID } from "../GroupRow";
import { GroupSettingContext } from "./GroupSettingWrapper";

const ShareSection = () => {
  const { t } = useTranslation("dashboard");
  const { values, setGroup } = useContext(GroupSettingContext);

  const permission = useMemo(() => new Boolset(values.permissions ?? ""), [values.permissions]);

  const toggle = useCallback(
    (bit: number, enabled: boolean) => {
      setGroup((p: GroupEnt) => ({
        ...p,
        permissions: new Boolset(p.permissions).set(bit, enabled).toString(),
      }));
    },
    [setGroup],
  );

  return (
    <SettingSection>
      <Typography variant="h6" gutterBottom>
        {t("group.share")}
      </Typography>
      <SettingSectionContent>
        {values?.id != AnonymousGroupID && (
          <SettingForm lgWidth={5}>
            <FormControl fullWidth>
              <FormControlLabel
                control={
                  <Switch
                    checked={permission.enabled(GroupPermission.share)}
                    onChange={(e) => toggle(GroupPermission.share, e.target.checked)}
                  />
                }
                label={t("group.allowCreateShareLink")}
              />
              <NoMarginHelperText>{t("group.allowCreateShareLinkDes")}</NoMarginHelperText>
            </FormControl>
          </SettingForm>
        )}
        <SettingForm lgWidth={5}>
          <FormControl fullWidth>
            <FormControlLabel
              control={
                <Switch
                  checked={permission.enabled(GroupPermission.share_free)}
                  onChange={(e) => toggle(GroupPermission.share_free, e.target.checked)}
                />
              }
              label={t("group.shareFree")}
            />
            <NoMarginHelperText>{t("group.shareFreeDes")}</NoMarginHelperText>
          </FormControl>
        </SettingForm>
        <SettingForm lgWidth={5}>
          <FormControl fullWidth>
            <FormControlLabel
              control={
                <Switch
                  checked={permission.enabled(GroupPermission.share_download)}
                  onChange={(e) => toggle(GroupPermission.share_download, e.target.checked)}
                />
              }
              label={t("group.allowDownloadShare")}
            />
            <NoMarginHelperText>{t("group.allowDownloadShareDes")}</NoMarginHelperText>
          </FormControl>
        </SettingForm>
        {values?.id != AnonymousGroupID && (
          <SettingForm lgWidth={5}>
            <FormControl fullWidth>
              <FormControlLabel
                control={
                  <Switch
                    checked={permission.enabled(GroupPermission.escalate_anonymity)}
                    onChange={(e) => toggle(GroupPermission.escalate_anonymity, e.target.checked)}
                  />
                }
                label={t("group.esclateAnonymity")}
              />
              <NoMarginHelperText>{t("group.esclateAnonymityDes")}</NoMarginHelperText>
            </FormControl>
          </SettingForm>
        )}
      </SettingSectionContent>
    </SettingSection>
  );
};

export default ShareSection;
