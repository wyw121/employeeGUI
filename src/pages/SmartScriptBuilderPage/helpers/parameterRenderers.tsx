import React from "react";
import { Input, InputNumber, Switch, Select, Slider } from "antd";

const { Option } = Select;
const { TextArea } = Input;

export const renderParameterInput = (
  param: any,
  value: any,
  onChange: (value: any) => void
) => {
  switch (param.type) {
    case "number":
      return (
        <InputNumber
          placeholder={`请输入${param.label}`}
          value={value}
          onChange={onChange}
          style={{ width: "100%" }}
        />
      );
    case "boolean":
      return (
        <Switch
          checked={value}
          onChange={onChange}
          checkedChildren="是"
          unCheckedChildren="否"
        />
      );
    case "select":
      return (
        <Select
          placeholder={`请选择${param.label}`}
          value={value}
          onChange={onChange}
          style={{ width: "100%" }}
        >
          {param.options?.map((option: string) => (
            <Option key={option} value={option}>
              {option}
            </Option>
          ))}
        </Select>
      );
    case "multiselect":
      return (
        <Select
          mode="multiple"
          placeholder={`请选择${param.label}`}
          value={value}
          onChange={onChange}
          style={{ width: "100%" }}
        >
          {param.options?.map((option: string) => (
            <Option key={option} value={option}>
              {option}
            </Option>
          ))}
        </Select>
      );
    case "slider":
      return (
        <Slider
          min={param.min}
          max={param.max}
          step={0.1}
          value={value}
          onChange={onChange}
          marks={{
            [param.min]: param.min,
            [param.max]: param.max,
          }}
        />
      );
    case "textarea":
      return (
        <TextArea
          placeholder={`请输入${param.label}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      );
    default:
      return (
        <Input
          placeholder={`请输入${param.label}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
};