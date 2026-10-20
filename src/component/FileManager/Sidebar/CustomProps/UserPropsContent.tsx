import { Autocomplete, Box, createFilterOptions, debounce, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getSearchUser, getUserInfo } from "../../../../api/api.ts";
import { User } from "../../../../api/user.ts";
import { useAppDispatch } from "../../../../redux/hooks.ts";
import { DenseFilledTextField, NoWrapBox, NoWrapTypography } from "../../../Common/StyledComponents.tsx";
import UserAvatar from "../../../Common/User/UserAvatar.tsx";
import { PropsContentProps } from "./CustomPropsItem.tsx";

/**
 * 「用户」类型自定义属性。
 *
 * 存储值是站点用户的 hash id；编辑时通过 `/user/search` 搜索并选择用户，
 * 只读时展示头像 + 昵称（查不到用户时退化为原始值）。
 */
const UserPropsContent = ({ prop, onChange, loading, readOnly }: PropsContentProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const [selected, setSelected] = useState<User | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<readonly User[]>([]);
  const [searching, setSearching] = useState(false);

  // 展示已有值
  useEffect(() => {
    if (!prop.value) {
      setSelected(null);
      return;
    }
    let active = true;
    dispatch(getUserInfo(prop.value))
      .then((user) => {
        if (active) {
          setSelected(user);
        }
      })
      .catch(() => {
        if (active) {
          setSelected(null);
        }
      });
    return () => {
      active = false;
    };
  }, [dispatch, prop.value]);

  const fetch = useMemo(
    () =>
      debounce((input: string, callback: (results?: readonly User[]) => void) => {
        setSearching(true);
        dispatch(getSearchUser(input))
          .then((results) => callback(results))
          .catch(() => callback([]))
          .finally(() => setSearching(false));
      }, 400),
    [dispatch],
  );

  useEffect(() => {
    let active = true;
    if (inputValue.length < 2) {
      setOptions([]);
      return undefined;
    }
    fetch(inputValue, (results) => {
      if (active) {
        setOptions(results ?? []);
      }
    });
    return () => {
      active = false;
    };
  }, [fetch, inputValue]);

  const filterOptions = useMemo(
    () => createFilterOptions<User>({ stringify: (option) => `${option.nickname} ${option.email}` }),
    [],
  );

  const label = selected ? `${selected.nickname} <${selected.email}>` : prop.value;

  if (readOnly) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
        {selected && <UserAvatar user={selected} sx={{ width: 20, height: 20, fontSize: "10px" }} />}
        <NoWrapTypography variant="body2">{label || "-"}</NoWrapTypography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }} onClick={(e) => e.stopPropagation()}>
      <Autocomplete<User>
        value={selected}
        options={options}
        loading={searching || loading}
        filterOptions={filterOptions}
        blurOnSelect
        onChange={(_e, value: User | null) => {
          setSelected(value);
          if (value) {
            onChange(value.id);
          }
        }}
        onInputChange={(_e, value) => setInputValue(value)}
        getOptionLabel={(option) => (typeof option === "string" ? option : `${option.nickname} <${option.email}>`)}
        noOptionsText={t("application:modals.noResults")}
        renderOption={(props, option) => (
          <li {...props}>
            <Box sx={{ display: "flex", width: "100%", alignItems: "center" }}>
              <UserAvatar user={option} sx={{ width: 24, height: 24, fontSize: "11px" }} />
              <NoWrapBox sx={{ width: "100%", ml: 1 }}>
                {option.nickname}
                <NoWrapTypography variant="body2" color="text.secondary" sx={{ width: "100%" }}>
                  {option.email}
                </NoWrapTypography>
              </NoWrapBox>
            </Box>
          </li>
        )}
        renderInput={(params) => (
          <DenseFilledTextField
            {...params}
            fullWidth
            placeholder={t("dashboard:customProps.userPlaceholder")}
            slotProps={{
              input: {
                ...params.InputProps,
                startAdornment: selected ? (
                  <UserAvatar user={selected} sx={{ width: 20, height: 20, fontSize: "10px", ml: 0.5, mr: 0.5 }} />
                ) : undefined,
              },
            }}
          />
        )}
      />
    </Box>
  );
};

export default UserPropsContent;
