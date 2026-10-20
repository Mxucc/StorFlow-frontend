import { FormControl, Link, Typography } from "@mui/material";
import { useCallback, useContext } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { GroupEnt } from "../../../../api/dashboard";
import SharesInput from "../../Common/SharesInput";
import SettingForm from "../../../Pages/Setting/SettingForm";
import { NoMarginHelperText, SettingSection, SettingSectionContent } from "../../Settings/Settings";
import { AnonymousGroupID } from "../GroupRow";
import { GroupSettingContext } from "./GroupSettingWrapper";

const DefaultPinnedSection = () => {
  const { t } = useTranslation("dashboard");
  const { values, setGroup } = useContext(GroupSettingContext);

  const onPinnedChange = useCallback(
    (shares: number[]) => {
      setGroup((p: GroupEnt) => ({
        ...p,
        settings: { ...p.settings, default_pinned_shares: shares.length ? shares : undefined },
      }));
    },
    [setGroup],
  );

  if (values?.id == AnonymousGroupID) {
    return null;
  }

  return (
    <SettingSection>
      <Typography variant="h6" gutterBottom>
        {t("group.defaultPinned")}
      </Typography>
      <SettingSectionContent>
        <SettingForm lgWidth={5}>
          <FormControl fullWidth>
            <SharesInput value={values.settings?.default_pinned_shares ?? []} onChange={onPinnedChange} />
            <NoMarginHelperText>
              <Trans
                i18nKey="group.defaultPinnedDes"
                ns={"dashboard"}
                components={[<Link component={RouterLink} to={"/admin/share"} />]}
              />
            </NoMarginHelperText>
          </FormControl>
        </SettingForm>
      </SettingSectionContent>
    </SettingSection>
  );
};

export default DefaultPinnedSection;
