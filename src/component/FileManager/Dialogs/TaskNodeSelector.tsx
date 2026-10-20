import { FormControl, FormHelperText, MenuItem, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAvailableNodes } from "../../../api/api.ts";
import { AvailableNode } from "../../../api/workflow.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import { DenseSelect } from "../../Common/StyledComponents.tsx";

export interface TaskNodeSelectorProps {
  // 当前选中的节点 ID，undefined 表示自动分配
  value?: string;
  onChange: (v?: string) => void;
}

const TaskNodeSelector = ({ value, onChange }: TaskNodeSelectorProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [nodes, setNodes] = useState<AvailableNode[]>([]);

  useEffect(() => {
    dispatch(getAvailableNodes())
      .then((res) => {
        setNodes(res.nodes ?? []);
      })
      .catch(() => {
        // 获取失败时保持空列表，选择器不渲染，不影响原有的任务创建流程
        setNodes([]);
      });
  }, [dispatch]);

  // 节点列表为空（用户组未开启「允许选择节点」，或可用节点被白名单过滤为空）时，
  // 整个选择器不显示，以保持与旧版本完全一致的行为。
  if (nodes.length === 0) {
    return null;
  }

  return (
    <FormControl fullWidth>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {t("modals.taskNode")}
      </Typography>
      <DenseSelect
        displayEmpty
        value={value ?? ""}
        onChange={(e) => {
          const selected = e.target.value as string;
          onChange(selected === "" ? undefined : selected);
        }}
      >
        <MenuItem value="">{t("modals.taskNodeAuto")}</MenuItem>
        {nodes.map((node) => (
          <MenuItem key={node.id} value={node.id}>
            {node.name}
          </MenuItem>
        ))}
      </DenseSelect>
      <FormHelperText>{t("modals.taskNodeDes")}</FormHelperText>
    </FormControl>
  );
};

export default TaskNodeSelector;
