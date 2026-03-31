import React, { useState } from "react";
import * as dataAgent from "@/helpers/dataAgent";
import { Panel, PanelSection } from "../Panel";
import { Loader2 } from "lucide-react";

import { busChannel } from "@/helpers/busChannel";
import { Button } from "@radix-ui/themes";
import { toast } from "sonner";
import { t } from "i18next";
import { useTranslation } from "react-i18next";
import { showErrorToast, showSuccessToast } from "@/helpers/errorHandler";

export const ImportAndExport = (props: any) => {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const importFromOPML = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".opml,.xml";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      setImporting(true);
      try {
        const text = await file.text();
        const result = await dataAgent.importOpml(text);

        busChannel.emit("getChannels");

        if (result.feed_count > 0) {
          toast.success(
            t("Successfully imported {count} feeds", {
              count: result.feed_count,
            }),
          );
        }

        if (result.folder_count > 0) {
          toast.success(
            t("Successfully created {count} folders", {
              count: result.folder_count,
            }),
          );
        }

        if (result.failed_count > 0) {
          toast.warning(
            t("Failed to import {count} feeds", {
              count: result.failed_count,
            }),
          );
          if (result.errors.length > 0) {
            console.error("Import errors:", result.errors);
          }
        }
      } catch (error) {
        showErrorToast(error, t("Failed to import OPML file"));
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  const exportToOPML = async () => {
    setExporting(true);
    try {
      const opmlContent = await dataAgent.exportOpml();
      const blob = new Blob([opmlContent], { type: "text/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "subscriptions.opml";
      a.click();
      URL.revokeObjectURL(url);
      showSuccessToast(t("OPML file exported successfully"));
    } catch (error) {
      showErrorToast(error, t("Failed to export OPML file"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Panel title={t("Import/Export")}>
      <PanelSection title={t("OPML Import")}>
        <div className="flex w-full items-center space-x-2">
          <div className="flex-1 text-sm text-gray-11">
            {t("Select an OPML file to import subscriptions")}
          </div>
          <Button
            onClick={importFromOPML}
            disabled={importing}
            loading={importing}
          >
            {t("Import")}
          </Button>
        </div>
      </PanelSection>
      <PanelSection title={t("OPML Export")}>
        <Button onClick={exportToOPML}>
          {exporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("Exporting")}
            </>
          ) : (
            <>{t("Download OPML subscriptions file")}</>
          )}
        </Button>
      </PanelSection>
    </Panel>
  );
};
