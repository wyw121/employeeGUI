import React from "react";
// AntD v5 React19 兼容补丁：需在 antd 组件使用前引入
import '@ant-design/v5-patch-for-react-19';
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

