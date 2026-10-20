import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./redux/store.ts";
import { router } from "./router";
import { RouterProvider } from "react-router-dom";
import "@fontsource-variable/inter";
import { NuqsAdapter } from "nuqs/adapters/react-router/v6";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <NuqsAdapter>
      <RouterProvider router={router}></RouterProvider>
    </NuqsAdapter>
  </Provider>,
);
