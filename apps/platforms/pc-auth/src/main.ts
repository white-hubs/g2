import { createFakePlatformContext } from "@g2-composition/contract";
import { createApp } from "vue";

import LoginPage from "./components/LoginPage";

createApp(LoginPage, { ctx: createFakePlatformContext(), onLoginSuccess: (r: unknown) => console.log(r) }).mount("#app");
