import { Box, Checkbox, FormControl, ListItemText, SelectChangeEvent } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getStoragePolicyList } from "../../../../api/api";
import { StoragePolicy } from "../../../../api/dashboard";
import { useAppDispatch } from "../../../../redux/hooks";
import FacebookCircularProgress from "../../../Common/CircularProgress";
import { DenseSelect, SquareChip } from "../../../Common/StyledComponents";
import { SquareMenuItem } from "../../../FileManager/ContextMenu/ContextMenu";
export interface PolicySelectionInputProps {
  value: number[];
  onChange: (value: number[]) => void;
}

const PolicySelectionInput = ({ value, onChange }: PolicySelectionInputProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const [policies, setPolicies] = useState<StoragePolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [policyMap, setPolicyMap] = useState<Record<number, StoragePolicy>>({});

  const handleChange = (event: SelectChangeEvent<unknown>) => {
    const {
      target: { value },
    } = event;
    // 选择顺序即优先级：第一个策略会被用作该用户组的默认上传策略。
    onChange(typeof value === "string" ? [] : (value as number[]));
  };

  useEffect(() => {
    setLoading(true);
    dispatch(getStoragePolicyList({ page: 1, page_size: 1000, order_by: "id", order_direction: "asc" }))
      .then((res) => {
        setPolicies(res.policies);
        setPolicyMap(
          res.policies.reduce(
            (acc, policy) => {
              acc[policy.id] = policy;
              return acc;
            },
            {} as Record<number, StoragePolicy>,
          ),
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <FormControl fullWidth>
      <DenseSelect
        multiple
        value={value}
        onChange={handleChange}
        sx={{
          minHeight: 39,
        }}
        disabled={loading}
        MenuProps={{
          PaperProps: { sx: { maxWidth: 230 } },
          MenuListProps: {
            sx: {
              "& .MuiMenuItem-root": {
                whiteSpace: "normal",
              },
            },
          },
        }}
        renderValue={(selected: number[]) =>
          !loading ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected.map((id) => (
                <SquareChip size="small" key={id} label={policyMap[id]?.name ?? id} />
              ))}
            </Box>
          ) : (
            <FacebookCircularProgress size={20} sx={{ mt: "1px" }} />
          )
        }
      >
        {policies.length > 0 &&
          policies.map((policy) => (
            <SquareMenuItem key={policy.id} value={policy.id}>
              <Checkbox size={"small"} checked={value.indexOf(policy.id) > -1} />
              <ListItemText
                slotProps={{
                  primary: { variant: "body2", fontWeight: 600 },
                  secondary: { variant: "caption" },
                }}
                primary={policy.name}
                secondary={t(`policy.${policy.type}`)}
              />
            </SquareMenuItem>
          ))}
      </DenseSelect>
    </FormControl>
  );
};

export default PolicySelectionInput;
