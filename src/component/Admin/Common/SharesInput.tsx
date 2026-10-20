import { AutocompleteProps, Box, debounce } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getShareList } from "../../../api/api.ts";
import { Share } from "../../../api/dashboard.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import { DenseAutocomplete, DenseFilledTextField, NoWrapTypography } from "../../Common/StyledComponents.tsx";

export interface SharesInputProps {
  // value 为分享的数字 ID 列表；不传表示该字段暂未接线（例如仍是 Pro 占位）。
  value?: number[];
  onChange?: (value: number[]) => void;
}

// styled() 会丢失 Autocomplete 的泛型，这里补回本组件需要的类型。
const SharesAutocomplete = DenseAutocomplete as unknown as React.ComponentType<
  AutocompleteProps<number, true, false, false> & { fullWidth?: boolean }
>;

/**
 * 按数字 ID 搜索分享链接（后台分享列表最左侧即为数字 ID）。
 * 已选中的分享会被解析为「文件名 + #ID」的 Chip 展示。
 */
const SharesInput = ({ value, onChange }: SharesInputProps) => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const [options, setOptions] = useState<number[]>([]);
  const [known, setKnown] = useState<Record<number, Share>>({});
  const [loading, setLoading] = useState(false);

  const remember = (shares: Share[]) => {
    setKnown((prev) => {
      const next = { ...prev };
      shares.forEach((share) => {
        next[share.id] = share;
      });
      return next;
    });
  };

  const search = useMemo(
    () =>
      debounce((keyword: string) => {
        const trimmed = keyword.trim();
        if (!trimmed) {
          setOptions([]);
          return;
        }

        setLoading(true);
        dispatch(
          getShareList({
            page: 1,
            page_size: 20,
            order_by: "id",
            order_direction: "desc",
            conditions: { share_id: trimmed },
          }),
        )
          .then((res) => {
            remember(res.shares);
            setOptions(res.shares.map((share) => share.id));
          })
          .catch(() => setOptions([]))
          .finally(() => setLoading(false));
      }, 400),
    [dispatch],
  );

  // 解析已选中但还未加载过的分享（例如编辑已有用户组配置）。
  useEffect(() => {
    const missing = (value ?? []).filter((id) => !known[id]);
    if (missing.length === 0) {
      return;
    }

    dispatch(
      getShareList({
        page: 1,
        page_size: 100,
        order_by: "id",
        order_direction: "desc",
        conditions: { share_id: missing.join(",") },
      }),
    )
      .then((res) => remember(res.shares))
      .catch(() => undefined);
  }, [value, known, dispatch]);

  return (
    <SharesAutocomplete
      multiple
      disableCloseOnSelect
      fullWidth
      value={value ?? []}
      options={options}
      loading={loading}
      filterOptions={(opts) => opts}
      getOptionLabel={(id) => known[id]?.edges?.file?.name ?? `#${id}`}
      onInputChange={(_e, input, reason) => {
        if (reason === "input") {
          search(input);
        }
      }}
      onChange={(_e, ids) => onChange?.(ids ?? [])}
      renderOption={(props, id) => (
        <li {...props} key={id}>
          <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <NoWrapTypography variant={"body2"}>{known[id]?.edges?.file?.name ?? `#${id}`}</NoWrapTypography>
            <NoWrapTypography variant={"caption"} color={"text.secondary"}>
              #{id}
            </NoWrapTypography>
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <DenseFilledTextField
          {...params}
          variant={"outlined"}
          margin={"dense"}
          placeholder={t("settings.searchShare")}
          type={"text"}
          fullWidth
        />
      )}
    />
  );
};

export default SharesInput;
