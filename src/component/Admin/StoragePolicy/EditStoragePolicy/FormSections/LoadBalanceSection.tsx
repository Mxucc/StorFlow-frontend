import { Typography } from "@mui/material";
import { useContext, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PolicyType } from "../../../../../api/explorer";
import SettingForm from "../../../../Pages/Setting/SettingForm";
import { SettingSection, SettingSectionContent } from "../../../Settings/Settings";
import LoadBalanceSubPolicyInput from "../../LoadBalanceSubPolicyInput";
import { StoragePolicySettingContext } from "../StoragePolicySettingWrapper";

/**
 * 负载均衡（load_balance）策略的子策略编辑区块。仅在该策略类型下渲染，
 * 内容写入 settings.load_balance_sub_policies。
 */
const LoadBalanceSection = () => {
  const { t } = useTranslation("dashboard");
  const { values, setPolicy } = useContext(StoragePolicySettingContext);

  const isLoadBalance = useMemo(() => values.type === PolicyType.load_balance, [values.type]);

  if (!isLoadBalance) {
    return null;
  }

  return (
    <SettingSection>
      <Typography variant="h6" gutterBottom>
        {t("policy.loadBalance")}
      </Typography>
      <SettingSectionContent>
        <SettingForm title={t("policy.subPolicies")} lgWidth={5}>
          <LoadBalanceSubPolicyInput
            value={values.settings?.load_balance_sub_policies}
            selfPolicyID={values.id}
            onChange={(subPolicies) =>
              setPolicy((p) => ({
                ...p,
                settings: { ...p.settings, load_balance_sub_policies: subPolicies },
              }))
            }
          />
        </SettingForm>
      </SettingSectionContent>
    </SettingSection>
  );
};

export default LoadBalanceSection;
