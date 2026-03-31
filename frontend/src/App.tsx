import { useEffect, useCallback, useMemo, useRef } from "react";

import { useBearStore } from "@/stores";
import { LocalPage } from "./layout/Local";
import { Theme } from "@radix-ui/themes";
import { DialogAboutApp } from "./components/About";
import { useShallow } from "zustand/react/shallow";
import { Toaster } from "sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { showErrorToast } from "@/helpers/errorHandler";

function App() {
  const store = useBearStore(
    useShallow((state) => ({
      userConfig: state.userConfig,
      getUserConfig: state.getUserConfig,
      updateSettingDialogStatus: state.updateSettingDialogStatus,
      updateAboutDialogStatus: state.updateAboutDialogStatus,
      updateAppMetadata: state.updateAppMetadata,
    })),
  );

  const accentColor = useMemo(() => {
    return store.userConfig.theme === "default" ||
      store.userConfig.theme === "custom"
      ? "indigo"
      : store.userConfig.theme || "indigo";
  }, [store.userConfig.theme]);


  const hasFetchedConfig = useRef(false);
  const getUserConfigRef = useRef(store.getUserConfig);

  getUserConfigRef.current = store.getUserConfig;

  useEffect(() => {
    if (!hasFetchedConfig.current) {
      hasFetchedConfig.current = true;
      console.log("app render");
      getUserConfigRef.current().then((cfg: UserConfig) => {
        const { color_scheme, customize_style } = cfg;
        let mode = color_scheme || "light";

        if (color_scheme === "system") {
          mode = window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
        }

        if (mode === "dark") {
          document.body.classList.add("dark-theme");
        } else {
          document.body.classList.remove("dark-theme");
        }

        if (customize_style && Object.keys(customize_style).length) {
          for (const key of Object.keys(customize_style)) {
            document.documentElement.style.setProperty(
              `--reading-editable-${key.replace(/_/gi, "-")}`,
              customize_style[key as keyof CustomizeStyle] as string,
            );
          }
        }
      });
    }
  }, []);

  return (
    <Theme
      className="w-[100vw] h-[100vh] "
      accentColor={accentColor}
      panelBackground="translucent"
    >
      <Toaster />
      <ErrorBoundary>
        <div className="h-full max-h-full ">
          <LocalPage />
        </div>
        <DialogAboutApp />
      </ErrorBoundary>
    </Theme>
  );
}

export default App;
