import { Box, IconButton, Stack, Typography } from "@mui/material";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { LoadBalanceSubPolicy, StoragePolicy } from "../../../api/dashboard";
import { PolicyType } from "../../../api/explorer";
import { DenseFilledTextField, SecondaryButton } from "../../Common/StyledComponents";
import Add from "../../Icons/Add";
import Delete from "../../Icons/Delete";
import SinglePolicySelectionInput from "../Common/SinglePolicySelectionInput";
import { NoMarginHelperText } from "../Settings/Settings";

export interface LoadBalanceSubPolicyInputProps {
  value?: LoadBalanceSubPolicy[];
  onChange: (value: LoadBalanceSubPolicy[]) => void;
  /** ID of the policy being edited, a load balance policy cannot reference itself. */
  selfPolicyID?: number;
}

/**
 * 负载均衡策略的子策略编辑器：选择已有的存储策略并设置权重，可增删行。
 * 每一行写入 settings.load_balance_sub_policies 的一项。
 */
const LoadBalanceSubPolicyInput = ({ value, onChange, selfPolicyID }: LoadBalanceSubPolicyInputProps) => {
  const { t } = useTranslation("dashboard");
  const subPolicies = value ?? [];

  const updateRow = useCallback(
    (index: number, patch: Partial<LoadBalanceSubPolicy>) => {
      onChange(subPolicies.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    },
    [onChange, subPolicies],
  );

  const removeRow = useCallback(
    (index: number) => {
      onChange(subPolicies.filter((_, i) => i !== index));
    },
    [onChange, subPolicies],
  );

  const addRow = useCallback(() => {
    onChange([...subPolicies, { policy_id: 0, weight: 1 }]);
  }, [onChange, subPolicies]);

  // 子策略只能是具体的存储策略：既不能是负载均衡策略本身（不允许嵌套），也不能是自己。
  const filterPolicy = useCallback(
    (policy: StoragePolicy) => policy.type !== PolicyType.load_balance && policy.id !== selfPolicyID,
    [selfPolicyID],
  );

  return (
    <Stack spacing={1.5}>
      {subPolicies.length > 0 && (
        <Stack direction="row" spacing={1} alignItems={"center"}>
          <Typography variant="body2" color="textSecondary" sx={{ flex: 1 }}>
            {t("policy.subPolicies")}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ width: 110 }}>
            {t("policy.subPolicyWeight")}
          </Typography>
          <Box sx={{ width: 40 }} />
        </Stack>
      )}
      {subPolicies.length === 0 && (
        <Typography variant="body2" color="textSecondary">
          {t("policy.subPolicyEmpty")}
        </Typography>
      )}
      {subPolicies.map((row, index) => (
        <Stack key={index} direction="row" spacing={1} alignItems={"flex-start"}>
          <Box sx={{ flex: 1 }}>
            <SinglePolicySelectionInput
              value={row.policy_id}
              onChange={(policyID) => updateRow(index, { policy_id: policyID })}
              filter={filterPolicy}
            />
          </Box>
          <Box sx={{ width: 110 }}>
            <DenseFilledTextField
              fullWidth
              required
              type="number"
              value={row.weight}
              onChange={(e) => updateRow(index, { weight: parseInt(e.target.value) || 0 })}
              slotProps={{ htmlInput: { min: 1 } }}
            />
          </Box>
          <IconButton color="error" onClick={() => removeRow(index)} sx={{ mt: 0.5 }}>
            <Delete />
          </IconButton>
        </Stack>
      ))}
      <Box>
        <SecondaryButton startIcon={<Add />} variant={"contained"} onClick={addRow}>
          {t("policy.addSubPolicy")}
        </SecondaryButton>
      </Box>
      <NoMarginHelperText>{t("policy.loadBalanceDes")}</NoMarginHelperText>
    </Stack>
  );
};

export default LoadBalanceSubPolicyInput;
