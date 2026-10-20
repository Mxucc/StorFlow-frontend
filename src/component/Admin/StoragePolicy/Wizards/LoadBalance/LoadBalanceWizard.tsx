import { Button, Stack } from "@mui/material";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StoragePolicy } from "../../../../../api/dashboard";
import { PolicyType } from "../../../../../api/explorer";
import { DenseFilledTextField } from "../../../../Common/StyledComponents";
import SettingForm from "../../../../Pages/Setting/SettingForm";
import { NoMarginHelperText } from "../../../Settings/Settings";
import { AddWizardProps } from "../../AddWizardDialog";
import LoadBalanceSubPolicyInput from "../../LoadBalanceSubPolicyInput";

/**
 * 负载均衡（load_balance）存储策略向导。
 *
 * 负载均衡策略本身没有存储驱动，它只保存一组「子策略 + 权重」，上传时按权重随机
 * 选择一个子策略作为实际落盘策略。因此这里只需要名称与子策略列表。
 */
const LoadBalanceWizard = ({ onSubmit }: AddWizardProps) => {
  const { t } = useTranslation("dashboard");
  const formRef = useRef<HTMLFormElement>(null);
  const [policy, setPolicy] = useState<StoragePolicy>({
    id: 0,
    name: "",
    type: PolicyType.load_balance,
    dir_name_rule: "uploads/{uid}/{path}",
    file_name_rule: "{uuid}_{originname}",
    settings: {
      load_balance_sub_policies: [{ policy_id: 0, weight: 1 }],
    },
    edges: {},
  });

  const handleSubmit = () => {
    if (!formRef.current?.checkValidity()) {
      formRef.current?.reportValidity();
      return;
    }
    onSubmit(policy);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <SettingForm title={t("policy.name")} lgWidth={12}>
          <DenseFilledTextField
            fullWidth
            required
            value={policy.name}
            onChange={(e) => setPolicy({ ...policy, name: e.target.value })}
          />
          <NoMarginHelperText>{t("policy.policyName")}</NoMarginHelperText>
        </SettingForm>
        <SettingForm title={t("policy.subPolicies")} lgWidth={12}>
          <LoadBalanceSubPolicyInput
            value={policy.settings?.load_balance_sub_policies}
            selfPolicyID={policy.id}
            onChange={(subPolicies) =>
              setPolicy((prev) => ({
                ...prev,
                settings: { ...prev.settings, load_balance_sub_policies: subPolicies },
              }))
            }
          />
        </SettingForm>
        <Button variant="contained" color="primary" onClick={handleSubmit}>
          {t("policy.create")}
        </Button>
      </Stack>
    </form>
  );
};

export default LoadBalanceWizard;
